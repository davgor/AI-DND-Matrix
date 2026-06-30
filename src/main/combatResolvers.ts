import type Database from 'better-sqlite3'
import type { AbilityScores, RandomFn } from '../engine/abilities'
import { abilityModifier } from '../engine/abilities'
import { computeAC } from '../engine/armorClass'
import { resolveNpcAttack } from '../engine/npcAttack'
import { resolvePlayerAttackAgainstNpc } from '../engine/playerAttack'
import { checkYieldEligibility } from '../engine/yieldEligibility'
import { proficiencyBonus } from '../engine/proficiency'
import { getEquippedArmorTier, getEquippedWeaponDamageProfile } from '../db/repositories/characterItems'
import { resolveNpcResistanceProfile } from '../db/repositories/npcResistances'
import {
  getActiveCombatant,
  getActiveEncounter,
  type CombatEncounter
} from '../db/repositories/combatEncounters'
import {
  advanceEncounterTurn,
  allHostilesDefeated,
  appendCombatTurnAdvanced,
  applyNpcYieldOutcome
} from './combatOrchestration'
import { appendEvent } from '../db/repositories/events'
import { applyNpcDamage, getNpcById, npcHasCombatStats, setNpcEncounterOutcome, type Npc } from '../db/repositories/npcs'
import { ensureNpcCombatStats } from '../db/repositories/npcCombatHydration'
import { resolveNpcAttackProfile } from '../db/repositories/npcAttackProfile'
import { getCharacterById, type Character } from '../db/repositories/characters'
import { generateNpcReaction, assembleNpcContext } from '../agents/npc'
import { decidePartyMemberAction, assemblePartyMemberContext } from '../agents/partyMember'
import { proposeYieldOutcome, buildYieldReviewInput } from '../agents/yieldReview'
import type { Provider } from '../agents/providers/types'
import type { CombatAttackResult, NpcYieldOutcome } from '../shared/combat/types'
import { MAX_COMBAT_CATCHUP_TURNS } from '../shared/combat/types'
import type { AttackLethality } from '../shared/npcCombat/types'
import { applyDamageAndStartDyingIfNeeded } from './dyingResolution'
import type { TurnResult } from './turnIpc'
import { CombatTurnError } from './combatErrors'

export interface CatchUpInput {
  db: Database.Database
  provider: Provider
  campaignId: string
  player: Character
  encounter: CombatEncounter
  rng: RandomFn
}

export interface PlayerAttackInput {
  db: Database.Database
  player: Character
  targetNpcId: string | undefined
  rng: RandomFn
  lethality?: AttackLethality
  acceptSurrender?: boolean
  offerMercy?: boolean
}

function reloadEncounter(db: Database.Database, campaignId: string): CombatEncounter {
  const encounter = getActiveEncounter(db, campaignId)
  if (!encounter) {
    throw new CombatTurnError('No active encounter')
  }
  return encounter
}

export interface PlayerAttackSyncResult {
  attackResult: CombatAttackResult
  npcYieldOutcome?: NpcYieldOutcome
  yieldNarrationHint?: string
  yieldPending?: {
    npcId: string
    suggestedOutcomes: NpcYieldOutcome[]
    lethality: AttackLethality
    offerMercy: boolean
  }
}

function computeAttackModifier(player: Character): number {
  const scores = (player.stats as { abilityScores?: AbilityScores }).abilityScores
  const agility = scores?.agility ?? 10
  const proficient = Boolean((player.stats as { weaponProficient?: boolean }).weaponProficient)
  return abilityModifier(agility) + (proficient ? proficiencyBonus(player.level) : 0)
}

interface YieldPendingInput {
  npcId: string
  npc: Npc
  hpAfter: number
  wouldKill: boolean
  lethality: AttackLethality
  offerMercy: boolean
}

function buildYieldPending(opts: YieldPendingInput): PlayerAttackSyncResult['yieldPending'] {
  const { npcId, npc, hpAfter, wouldKill, lethality, offerMercy } = opts
  const eligibility = checkYieldEligibility({
    combatTier: npc.combatTier,
    temperament: npc.temperament,
    hp: hpAfter,
    maxHp: npc.maxHp ?? 0,
    wouldKill,
    canSpeak: npc.canSpeak
  })
  if (!eligibility.yieldCheckRequired || eligibility.suggestedOutcomes.length === 0) {
    return undefined
  }
  return { npcId, suggestedOutcomes: eligibility.suggestedOutcomes, lethality, offerMercy }
}

export function resolvePlayerAttack(input: PlayerAttackInput): PlayerAttackSyncResult {
  const { db, player, targetNpcId, rng, lethality = 'lethal' } = input
  if (!targetNpcId) {
    throw new CombatTurnError('Attack requires a targetNpcId')
  }
  const targetNpc = ensureNpcCombatStats(db, getNpcById(db, targetNpcId) as Npc)
  if (!targetNpc || targetNpc.hp === null || targetNpc.ac === null) {
    throw new CombatTurnError('Invalid attack target')
  }
  const weaponProfile = getEquippedWeaponDamageProfile(db, player.id)
  const resolution = resolvePlayerAttackAgainstNpc({
    rng,
    attackModifier: computeAttackModifier(player),
    weaponComponents: weaponProfile.components,
    targetAc: targetNpc.ac,
    targetHp: targetNpc.hp,
    targetResistances: resolveNpcResistanceProfile(db, targetNpc),
    lethality
  })
  const hpAfter = applyNpcDamage(db, targetNpc.id, resolution.damage)
  const attackResult: CombatAttackResult = {
    attacker: { kind: 'player', id: player.id },
    target: { kind: 'npc', id: targetNpc.id },
    hit: resolution.hit,
    crit: resolution.crit,
    attackRoll: resolution.attackRoll,
    attackTotal: resolution.attackTotal,
    damage: resolution.damage,
    damageBreakdown: resolution.damageBreakdown,
    targetHpAfter: hpAfter,
    targetDefeated: resolution.targetDefeated
  }
  appendEvent(db, { campaignId: player.campaignId, type: 'combat_attack', payload: attackResult as unknown as Record<string, unknown> })
  if (!resolution.hit) {
    return { attackResult }
  }
  if (resolution.incapacitated) {
    setNpcEncounterOutcome(db, targetNpc.id, 'incapacitated')
    return { attackResult, npcYieldOutcome: 'incapacitated' }
  }
  const yieldPending = buildYieldPending(
    { npcId: targetNpcId, npc: targetNpc, hpAfter, wouldKill: resolution.wouldKill, lethality, offerMercy: input.offerMercy ?? false }
  )
  return yieldPending ? { attackResult, yieldPending } : { attackResult }
}

export async function resolveYieldReview(
  db: Database.Database,
  provider: Provider,
  campaignId: string,
  syncResult: PlayerAttackSyncResult
): Promise<{ npcYieldOutcome?: NpcYieldOutcome; yieldNarrationHint?: string }> {
  if (!syncResult.yieldPending) {
    return { npcYieldOutcome: syncResult.npcYieldOutcome, yieldNarrationHint: syncResult.yieldNarrationHint }
  }
  const { npcId, suggestedOutcomes, lethality, offerMercy } = syncResult.yieldPending
  const npc = getNpcById(db, npcId)
  if (!npc) {
    return {}
  }
  const reviewInput = buildYieldReviewInput({ npc, lethality, playerOffersMercy: offerMercy, allowedOutcomes: suggestedOutcomes })
  const review = await proposeYieldOutcome(provider, reviewInput)
  if (review.outcome !== 'fight_on') {
    applyNpcYieldOutcome(db, campaignId, npcId, { outcome: review.outcome as NpcYieldOutcome, narrationHint: review.narrationText })
    return { npcYieldOutcome: review.outcome as NpcYieldOutcome, yieldNarrationHint: review.narrationText }
  }
  return {}
}

async function resolveNpcCombatTurn(input: CatchUpInput & { npcId: string }): Promise<
  TurnResult['npcReactions'][number] | undefined
> {
  const { db, provider, campaignId, player, rng, npcId } = input
  const npc = ensureNpcCombatStats(db, getNpcById(db, npcId) as Npc)
  if (!npc || !npcHasCombatStats(npc)) {
    return undefined
  }
  const reaction = await generateNpcReaction(provider, npc, assembleNpcContext(db, npc), 'Combat turn')
  const { attackBonus, damageRoll } = resolveNpcAttackProfile(db, npc)
  const scores = (player.stats as { abilityScores?: AbilityScores }).abilityScores
  const attack = resolveNpcAttack({
    rng,
    attackBonus,
    damageRoll,
    targetAc: computeAC(scores?.agility ?? 10, getEquippedArmorTier(db, player.id)),
    targetHp: player.hp
  })

  const attackResult = attack.hit
    ? {
        hit: true as const,
        damage: attack.damage,
        resolution: applyDamageAndStartDyingIfNeeded(db, player, attack.damage).resolution
      }
    : { hit: false as const }

  appendEvent(db, {
    campaignId,
    type: 'combat_attack',
    payload: {
      attacker: { kind: 'npc', id: npc.id },
      target: { kind: 'player', id: player.id },
      hit: attack.hit,
      crit: attack.crit,
      attackRoll: attack.attackRoll,
      attackTotal: attack.attackTotal,
      damage: attack.damage,
      targetHpAfter: getCharacterById(db, player.id)?.hp ?? 0,
      targetDefeated: false
    }
  })

  return { npcId: npc.id, npcName: npc.name, text: reaction.text, reactionKind: reaction.reactionKind, attackResult }
}

async function resolvePartyCombatTurn(
  input: CatchUpInput & { memberId: string }
): Promise<TurnResult['partyMemberActions'][number]> {
  const { db, provider, campaignId, memberId } = input
  const member = getCharacterById(db, memberId)
  if (!member) {
    return { characterId: memberId, name: 'Unknown', actionText: '' }
  }
  const action = await decidePartyMemberAction(
    provider,
    member,
    assemblePartyMemberContext(db, campaignId, member),
    'Combat turn'
  )
  appendEvent(db, {
    campaignId,
    type: 'party_member_action',
    payload: { characterId: member.id, content: action.actionText, combatTurn: true }
  })
  return { characterId: member.id, name: member.name, actionText: action.actionText }
}

function recordNpcHit(
  reaction: TurnResult['npcReactions'][number],
  npcId: string,
  lastAttackerNpcId: string | undefined
): string | undefined {
  if (reaction?.attackResult?.hit) {
    return npcId
  }
  return lastAttackerNpcId
}

export async function resolveNonPlayerCatchUp(input: CatchUpInput): Promise<{
  narration: string
  npcReactions: TurnResult['npcReactions']
  partyMemberActions: TurnResult['partyMemberActions']
  lastAttackerNpcId?: string
}> {
  const npcReactions: TurnResult['npcReactions'] = []
  const partyMemberActions: TurnResult['partyMemberActions'] = []
  let current = input.encounter
  let lastAttackerNpcId: string | undefined

  for (let steps = 0; steps < MAX_COMBAT_CATCHUP_TURNS; steps += 1) {
    const active = getActiveCombatant(current)
    if (active.kind === 'player' && active.id === input.player.id) {
      break
    }
    if (active.kind === 'npc') {
      const reaction = await resolveNpcCombatTurn({ ...input, npcId: active.id })
      if (reaction) {
        npcReactions.push(reaction)
        lastAttackerNpcId = recordNpcHit(reaction, active.id, lastAttackerNpcId)
      }
    } else if (active.kind === 'ai_party_member') {
      partyMemberActions.push(await resolvePartyCombatTurn({ ...input, memberId: active.id }))
    }
    current = advanceEncounterTurn(
      input.db,
      reloadEncounter(input.db, input.campaignId),
      current.participantIds
    )
    appendCombatTurnAdvanced(input.db, current)
    if (allHostilesDefeated(input.db, current)) {
      break
    }
  }

  return { narration: '', npcReactions, partyMemberActions, lastAttackerNpcId }
}
