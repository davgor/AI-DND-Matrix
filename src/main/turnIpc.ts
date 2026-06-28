import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { AbilityScores, RandomFn } from '../engine/abilities'
import { decidePartyMemberAction, assemblePartyMemberContext } from '../agents/partyMember'
import { generateNpcReaction, assembleNpcContext } from '../agents/npc'
import {
  assembleNarrationContext,
  interpretIntent,
  narrate,
  persistNarrationSideEffects,
  type IntentInterpretation,
  type NarrationResult
} from '../agents/dm'
import type { Provider } from '../agents/providers/types'
import { computeAC } from '../engine/armorClass'
import { DC_MIN, resolveCheck, rollD20 } from '../engine/checks'
import { isNaturalTwenty, resolveDamage, type DamageRoll } from '../engine/damage'
import { computeHP, type Archetype } from '../engine/hp'
import { proficiencyBonus } from '../engine/proficiency'
import { resolveLongRest, resolveShortRest } from '../engine/rest'
import { resolveTravel } from '../engine/travel'
import { buildAgentProvider } from './campaignIpc'
import { advanceInGameDate } from '../db/repositories/campaigns'
import {
  getCharacterById,
  listCharactersByCampaign,
  updateCharacter,
  type Character
} from '../db/repositories/characters'
import { appendEvent } from '../db/repositories/events'
import { appendNpcMemory } from '../db/repositories/npcMemories'
import { getNpcById } from '../db/repositories/npcs'
import { listRegionsByCampaign } from '../db/repositories/regions'
import { createSaveSnapshot } from '../db/repositories/saves'
import {
  applyDamageAndStartDyingIfNeeded,
  progressDyingSequence,
  type DyingResolution
} from './dyingResolution'
import { getDb } from './db'

export interface TurnInput {
  campaignId: string
  characterId: string
  playerInput: string
}

export interface NpcAttackOutcome {
  hit: boolean
  damage?: number
  resolution?: DyingResolution
}

export interface NpcReactionResult {
  npcId: string
  npcName: string
  dialogue: string
  attackResult?: NpcAttackOutcome
}

export interface PartyMemberActionResult {
  characterId: string
  name: string
  actionText: string
}

export interface TurnResult {
  narrationText: string
  check?: { roll: number; total: number; dc: number; success: boolean }
  hpAfter?: number
  inGameDateAfter?: number
  npcReactions: NpcReactionResult[]
  partyMemberActions: PartyMemberActionResult[]
  dyingResolution?: DyingResolution
}

function getCurrentRegionId(db: Database.Database, campaignId: string, character: Character): string {
  const stats = character.stats as { currentRegionId?: string }
  if (stats.currentRegionId) {
    return stats.currentRegionId
  }
  const [firstRegion] = listRegionsByCampaign(db, campaignId)
  return firstRegion?.id ?? ''
}

interface RestTurnInput {
  campaignId: string
  character: Character
  kind: 'restShort' | 'restLong'
  playerInput: string
}

function resolveRestTurn(db: Database.Database, turn: RestTurnInput): TurnResult {
  const { campaignId, character, kind, playerInput } = turn
  const abilityScores = (character.stats as { abilityScores?: AbilityScores }).abilityScores
  const maxHp = computeHP(character.characterClass as Archetype, character.level, abilityScores?.body ?? 10)
  const rest = kind === 'restShort' ? resolveShortRest(character.hp, maxHp) : resolveLongRest(character.hp, maxHp)
  const hpAfter = character.hp + rest.hpRestored
  updateCharacter(db, character.id, { hp: hpAfter })

  const inGameDateAfter =
    rest.inGameDateAdvanceDays > 0 ? advanceInGameDate(db, campaignId, rest.inGameDateAdvanceDays) : undefined

  const narrationText =
    kind === 'restShort'
      ? `${character.name} catches their breath, recovering ${rest.hpRestored} HP.`
      : `${character.name} makes camp for the night, recovering ${rest.hpRestored} HP as a day passes.`

  appendEvent(db, {
    campaignId,
    type: 'rest',
    payload: { characterId: character.id, kind, hpRestored: rest.hpRestored, narrationText, playerInput }
  })
  createSaveSnapshot(db, campaignId)

  return { narrationText, hpAfter, inGameDateAfter, npcReactions: [], partyMemberActions: [] }
}

function resolveTravelTurn(
  db: Database.Database,
  campaignId: string,
  estimatedDays: number,
  playerInput: string
): TurnResult {
  const days = resolveTravel(estimatedDays)
  const inGameDateAfter = advanceInGameDate(db, campaignId, days)
  const narrationText = `${days} day${days === 1 ? '' : 's'} pass as you travel.`
  appendEvent(db, { campaignId, type: 'travel', payload: { days, narrationText, playerInput } })
  createSaveSnapshot(db, campaignId)
  return { narrationText, inGameDateAfter, npcReactions: [], partyMemberActions: [] }
}

interface RolledOutcome {
  outcome: { success: boolean; total: number; dc: number }
  rolled: boolean
  roll?: number
}

function resolveOutcome(character: Character, intent: IntentInterpretation, rng: RandomFn): RolledOutcome {
  if (!intent.checkNeeded || !intent.ability) {
    return { outcome: { success: true, total: 0, dc: 0 }, rolled: false }
  }
  const abilityScores = (character.stats as { abilityScores?: AbilityScores }).abilityScores
  const abilityScore = abilityScores?.[intent.ability] ?? 10
  const dc = intent.dc ?? DC_MIN
  const result = resolveCheck({
    rng,
    abilityScore,
    proficient: intent.proficient ?? false,
    proficiencyBonus: proficiencyBonus(character.level),
    dc
  })
  return { outcome: { success: result.success, total: result.total, dc }, rolled: true, roll: result.roll }
}

const NPC_ATTACK_BONUS = 2
const NPC_DAMAGE_ROLL: DamageRoll = { diceCount: 1, diceSize: 6, modifier: 0 }

function resolveNpcAttackAgainstPlayer(
  db: Database.Database,
  player: Character,
  rng: RandomFn
): NpcAttackOutcome {
  const stats = player.stats as { abilityScores?: AbilityScores; ac?: number }
  const ac = stats.ac ?? computeAC(stats.abilityScores?.agility ?? 10, 'none')
  const d20 = rollD20(rng)
  if (d20 + NPC_ATTACK_BONUS < ac) {
    return { hit: false }
  }
  const damage = resolveDamage(NPC_DAMAGE_ROLL, rng, isNaturalTwenty(d20))
  const { resolution } = applyDamageAndStartDyingIfNeeded(db, player, damage)
  return { hit: true, damage, resolution }
}

interface NpcReactionsContext {
  campaignId: string
  player: Character
  narrationResult: NarrationResult
  rng: RandomFn
}

async function resolveNpcReactions(
  db: Database.Database,
  provider: Provider,
  context: NpcReactionsContext
): Promise<NpcReactionResult[]> {
  const results: NpcReactionResult[] = []
  for (const npcId of context.narrationResult.reactingNpcIds ?? []) {
    const npc = getNpcById(db, npcId)
    if (!npc) {
      continue
    }
    const npcContext = assembleNpcContext(db, npc)
    const reaction = await generateNpcReaction(provider, npc, npcContext, context.narrationResult.narrationText)
    appendNpcMemory(db, { npcId, content: reaction.dialogue, tags: [] })
    appendEvent(db, {
      campaignId: context.campaignId,
      type: 'npc_reaction',
      payload: { npcId, dialogue: reaction.dialogue, attack: Boolean(reaction.attack) }
    })
    const attackResult = reaction.attack
      ? resolveNpcAttackAgainstPlayer(db, context.player, context.rng)
      : undefined
    results.push({ npcId, npcName: npc.name, dialogue: reaction.dialogue, attackResult })
  }
  return results
}

async function resolvePartyMemberActions(
  db: Database.Database,
  provider: Provider,
  campaignId: string,
  sceneNarration: string
): Promise<PartyMemberActionResult[]> {
  const partyMembers = listCharactersByCampaign(db, campaignId).filter((c) => c.kind === 'ai_party_member')
  const results: PartyMemberActionResult[] = []
  for (const member of partyMembers) {
    const context = assemblePartyMemberContext(db, campaignId, member.id)
    const action = await decidePartyMemberAction(provider, member, context, sceneNarration)
    appendEvent(db, {
      campaignId,
      type: 'party_member_action',
      payload: { characterId: member.id, content: action.actionText }
    })
    results.push({ characterId: member.id, name: member.name, actionText: action.actionText })
  }
  return results
}

interface CheckTurnInput {
  character: Character
  intent: IntentInterpretation
  playerInput: string
  rng: RandomFn
}

async function resolveCheckTurn(
  db: Database.Database,
  provider: Provider,
  campaignId: string,
  turn: CheckTurnInput
): Promise<TurnResult> {
  const { character, intent, playerInput, rng } = turn
  const resolved = resolveOutcome(character, intent, rng)
  const regionId = getCurrentRegionId(db, campaignId, character)
  const narrationContext = assembleNarrationContext(db, campaignId, regionId)
  const narrationResult = await narrate(provider, resolved.outcome, narrationContext)
  persistNarrationSideEffects(db, campaignId, regionId, narrationResult)

  appendEvent(db, {
    campaignId,
    type: 'player_action',
    payload: {
      characterId: character.id,
      playerInput,
      outcome: resolved.outcome,
      narrationText: narrationResult.narrationText
    }
  })

  const npcReactions = await resolveNpcReactions(db, provider, {
    campaignId,
    player: character,
    narrationResult,
    rng
  })
  const partyMemberActions = await resolvePartyMemberActions(
    db,
    provider,
    campaignId,
    narrationResult.narrationText
  )

  createSaveSnapshot(db, campaignId)

  return {
    narrationText: narrationResult.narrationText,
    check: resolved.rolled
      ? {
          roll: resolved.roll as number,
          total: resolved.outcome.total,
          dc: resolved.outcome.dc,
          success: resolved.outcome.success
        }
      : undefined,
    npcReactions,
    partyMemberActions
  }
}

export async function resolvePlayerTurn(
  db: Database.Database,
  provider: Provider,
  turnInput: TurnInput,
  rng: RandomFn
): Promise<TurnResult> {
  const character = getCharacterById(db, turnInput.characterId)
  if (!character) {
    throw new Error(`Character ${turnInput.characterId} not found`)
  }

  const priorDying = progressDyingSequence(db, turnInput.campaignId, character, rng)
  if (priorDying) {
    appendEvent(db, {
      campaignId: turnInput.campaignId,
      type: 'dying_resolution',
      payload: {
        characterId: character.id,
        status: priorDying.status,
        narrationText: priorDying.message
      }
    })
    createSaveSnapshot(db, turnInput.campaignId)
    return {
      narrationText: priorDying.message,
      npcReactions: [],
      partyMemberActions: [],
      dyingResolution: priorDying
    }
  }

  const intent = await interpretIntent(provider, turnInput.playerInput)

  if (intent.actionType === 'restShort' || intent.actionType === 'restLong') {
    return resolveRestTurn(db, {
      campaignId: turnInput.campaignId,
      character,
      kind: intent.actionType,
      playerInput: turnInput.playerInput
    })
  }
  if (intent.actionType === 'travel') {
    return resolveTravelTurn(db, turnInput.campaignId, intent.travelDays ?? 1, turnInput.playerInput)
  }

  return resolveCheckTurn(db, provider, turnInput.campaignId, {
    character,
    intent,
    playerInput: turnInput.playerInput,
    rng
  })
}

export function registerTurnHandlers(): void {
  ipcMain.handle('turn:resolve', (_event, input: TurnInput) =>
    resolvePlayerTurn(getDb(), buildAgentProvider(), input, Math.random)
  )
}
