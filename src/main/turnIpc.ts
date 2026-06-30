import { ipcMain } from 'electron'
import type { PendingAlignmentShift } from '../shared/alignment/types'
import { stripActionMarkers, wrapActionDescription } from '../shared/alignment/types'
import type Database from 'better-sqlite3'
import type { AbilityScores, RandomFn } from '../engine/abilities'
import { decidePartyMemberAction, assemblePartyMemberContext } from '../agents/partyMember'
import {
  assembleInactivePlayerContext,
  decideInactivePlayerAction,
  listInactiveLivingPlayersInRegion
} from '../agents/inactivePlayer'
import { generateNpcReaction, assembleNpcContext } from '../agents/npc'
import {
  assembleNarrationContext,
  buildCombatIntentContext,
  interpretIntent,
  narrate,
  persistNarrationSideEffects,
  type IntentInterpretation,
  type NarrationResult
} from '../agents/dm'
import { reviewTurn } from '../agents/turnReview'
import type { TurnBeat, TurnRoutingPlan } from '../shared/turnRouting/types'
import type { Provider } from '../agents/providers/types'
import { computeAC } from '../engine/armorClass'
import { getEquippedArmorTier, getEquippedWeaponDamageProfile } from '../db/repositories/characterItems'
import { isNaturalTwenty, resolveDamage, type DamageRoll } from '../engine/damage'
import { resolveWeaponDamage } from '../engine/weaponDamage'
import { DC_MIN, resolveCheck, rollD20 } from '../engine/checks'
import { resolveModificationTurn } from './modificationTurn'
import { resolveCharacterMaxHp } from '../shared/hp/resolveMaxHp'
import { proficiencyBonus } from '../engine/proficiency'
import { resolveLongRest, resolveShortRest } from '../engine/rest'
import { resolveTravel } from '../engine/travel'
import { buildAgentProvider } from './campaignIpc'
import { generateRegionForCampaign } from './campaignEditIpc'
import { advanceInGameDate } from '../db/repositories/campaigns'
import {
  getCharacterById,
  listPartyMembersForPlayer,
  updateCharacter,
  type Character
} from '../db/repositories/characters'
import { appendEvent } from '../db/repositories/events'
import { appendNpcMemory } from '../db/repositories/npcMemories'
import { getNpcById } from '../db/repositories/npcs'
import { listRegionsByCampaign } from '../db/repositories/regions'
import { listStoryThreadsByCampaign } from '../db/repositories/storyThreads'
import { applyQuestRewardsToBeatState } from './questRewardBeats'
import { assertNoPendingLevelUp } from './progressionPipeline'
import type { LootGrantAccepted } from '../shared/loot/types'
import { createSaveSnapshot } from '../db/repositories/saves'
import {
  applyDamageAndStartDyingIfNeeded,
  progressDyingSequence,
  type DyingResolution
} from './dyingResolution'
import { getActiveEncounter } from '../db/repositories/combatEncounters'
import { getDb } from './db'
import { CombatTurnError, resolveCombatTurn, shouldRouteToCombat } from './combatTurn'
import { generateObituaryForDeath, type GenerateObituaryInput } from './obituaryIpc'
import type { CombatAttackResult, CombatStateSnapshot } from '../shared/combat/types'
import type { FleeTurnOutcome } from '../shared/combat/flee/types'

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
  text: string
  reactionKind: 'dialogue' | 'action'
  attackResult?: NpcAttackOutcome
}

export interface PartyMemberActionResult {
  characterId: string
  name: string
  actionText: string
}

export interface InactivePlayerActionResult {
  characterId: string
  name: string
  actionText: string
}

export interface ProposedPromotion {
  npcId: string
  npcName: string
}

export interface TurnResult {
  narrationText: string
  playerActionText?: string
  check?: { roll: number; total: number; dc: number; success: boolean }
  hpAfter?: number
  inGameDateAfter?: number
  npcReactions: NpcReactionResult[]
  partyMemberActions: PartyMemberActionResult[]
  inactivePlayerActions?: InactivePlayerActionResult[]
  dyingResolution?: DyingResolution
  proposedPromotion?: ProposedPromotion
  pendingAlignmentShift: PendingAlignmentShift | null
  alignmentShiftCommitted?: string
  combatAttack?: CombatAttackResult
  combatState?: CombatStateSnapshot | null
  fleeOutcome?: FleeTurnOutcome
  defeatDispositionNarration?: string
  playerImprisoned?: boolean
  npcYieldOutcome?: import('../shared/combat/types').NpcYieldOutcome
  yieldNarrationHint?: string
  lootNarration?: string
  lootGrants?: LootGrantAccepted[]
  xpNarration?: string
  xpAmount?: number
  leveledUp?: boolean
  levelsGained?: number
  itemModification?: { characterItemId: string; kind: string; summary: string }
}

function buildTurnResultExtras(
  db: Database.Database,
  characterId: string,
  alignmentShiftCommitted?: string
): Pick<TurnResult, 'pendingAlignmentShift' | 'alignmentShiftCommitted'> {
  const character = getCharacterById(db, characterId)
  return {
    pendingAlignmentShift: character?.pendingAlignmentShift ?? null,
    alignmentShiftCommitted
  }
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
  const maxHp = resolveCharacterMaxHp(character)
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

  return {
    narrationText,
    hpAfter,
    inGameDateAfter,
    npcReactions: [],
    partyMemberActions: [],
    inactivePlayerActions: [],
    ...buildTurnResultExtras(db, character.id)
  }
}

function resolveTravelTurn(
  db: Database.Database,
  input: { campaignId: string; estimatedDays: number; playerInput: string; characterId: string },
  destinationRegionId?: string
): TurnResult {
  const { campaignId, estimatedDays, playerInput, characterId } = input
  const days = resolveTravel(estimatedDays)
  const inGameDateAfter = advanceInGameDate(db, campaignId, days)
  if (destinationRegionId) {
    const character = getCharacterById(db, characterId)
    if (character) {
      updateCharacter(db, characterId, {
        stats: { ...(character.stats as Record<string, unknown>), currentRegionId: destinationRegionId }
      })
    }
  }
  const narrationText = destinationRegionId
    ? `After ${days} day${days === 1 ? '' : 's'} of travel, you arrive at your destination.`
    : `${days} day${days === 1 ? '' : 's'} pass as you travel.`
  appendEvent(db, {
    campaignId,
    type: 'travel',
    payload: { days, narrationText, playerInput, characterId, destinationRegionId }
  })
  createSaveSnapshot(db, campaignId)
  return {
    narrationText,
    inGameDateAfter,
    npcReactions: [],
    partyMemberActions: [],
    inactivePlayerActions: [],
    ...buildTurnResultExtras(db, characterId)
  }
}

async function resolveTravelTurnWithDestination(
  db: Database.Database,
  provider: Provider,
  input: { campaignId: string; estimatedDays: number; playerInput: string; characterId: string },
  intent: IntentInterpretation
): Promise<TurnResult> {
  const destination = intent.travelDestinationName?.trim()
  if (!destination) {
    return resolveTravelTurn(db, input)
  }
  const regions = listRegionsByCampaign(db, input.campaignId)
  const matched = regions.find(
    (region) => region.name.toLowerCase() === destination.toLowerCase()
  )
  if (matched) {
    return resolveTravelTurn(db, input, matched.id)
  }
  try {
    const detail = await generateRegionForCampaign(db, provider, {
      campaignId: input.campaignId,
      seedPrompt: destination
    })
    const newRegion =
      detail.regions.find((region) => region.name.toLowerCase() === destination.toLowerCase()) ??
      detail.regions.at(-1)
    if (!newRegion) {
      throw new Error('Region generation produced no destination')
    }
    return resolveTravelTurn(db, input, newRegion.id)
  } catch {
    return {
      narrationText: `The way to ${destination} could not be charted — you remain where you are.`,
      npcReactions: [],
      partyMemberActions: [],
      inactivePlayerActions: [],
      ...buildTurnResultExtras(db, input.characterId)
    }
  }
}

interface RolledOutcome {
  outcome: { success: boolean; total: number; dc: number }
  rolled: boolean
  roll: number | undefined
}

function resolveOutcome(character: Character, intent: IntentInterpretation, rng: RandomFn): RolledOutcome {
  if (!intent.checkNeeded || !intent.ability) {
    return { outcome: { success: true, total: 0, dc: 0 }, rolled: false, roll: undefined }
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

export function resolvePlayerEquippedAttackDamage(
  db: Database.Database,
  characterId: string,
  rng: RandomFn,
  attackRoll: number
): number {
  const profile = getEquippedWeaponDamageProfile(db, characterId)
  return resolveWeaponDamage(profile.components, rng, isNaturalTwenty(attackRoll)).total
}

function resolveNpcAttackAgainstPlayer(
  db: Database.Database,
  player: Character,
  rng: RandomFn
): NpcAttackOutcome {
  const stats = player.stats as { abilityScores?: AbilityScores; ac?: number }
  const armorTier = getEquippedArmorTier(db, player.id)
  const agility = stats.abilityScores?.agility ?? 10
  const ac = stats.ac ?? computeAC(agility, armorTier)
  const d20 = rollD20(rng)
  if (d20 + NPC_ATTACK_BONUS < ac) {
    return { hit: false }
  }
  const damage = resolveDamage(NPC_DAMAGE_ROLL, rng, isNaturalTwenty(d20))
  const { resolution } = applyDamageAndStartDyingIfNeeded(db, player, damage)
  return { hit: true, damage, resolution }
}

interface TargetedNpcReactionInput {
  campaignId: string
  player: Character
  npcId: string
  sceneNarration: string
  rng: RandomFn
}

async function resolveTargetedNpcReaction(
  db: Database.Database,
  provider: Provider,
  input: TargetedNpcReactionInput
): Promise<NpcReactionResult | undefined> {
  const npc = getNpcById(db, input.npcId)
  if (!npc) {
    return undefined
  }
  const npcContext = assembleNpcContext(db, npc)
  const reaction = await generateNpcReaction(
    provider,
    npc,
    npcContext,
    input.sceneNarration
  )
  appendNpcMemory(db, { npcId: input.npcId, content: reaction.text, tags: [] })
  appendEvent(db, {
    campaignId: input.campaignId,
    type: 'npc_reaction',
    payload: {
      npcId: input.npcId,
      text: reaction.text,
      reactionKind: reaction.reactionKind,
      attack: Boolean(reaction.attack)
    }
  })
  const attackResult = reaction.attack && !getActiveEncounter(db, input.campaignId)
    ? resolveNpcAttackAgainstPlayer(db, input.player, input.rng)
    : undefined
  return {
    npcId: input.npcId,
    npcName: npc.name,
    text: reaction.text,
    reactionKind: reaction.reactionKind,
    attackResult
  }
}

async function resolvePartyMemberActions(
  db: Database.Database,
  provider: Provider,
  activeCharacterId: string,
  sceneNarration: string
): Promise<PartyMemberActionResult[]> {
  const partyMembers = listPartyMembersForPlayer(db, activeCharacterId)
  const results: PartyMemberActionResult[] = []
  for (const member of partyMembers) {
    const context = assemblePartyMemberContext(db, member.campaignId, member)
    const action = await decidePartyMemberAction(provider, member, context, sceneNarration)
    appendEvent(db, {
      campaignId: member.campaignId,
      type: 'party_member_action',
      payload: { characterId: member.id, content: action.actionText }
    })
    results.push({ characterId: member.id, name: member.name, actionText: action.actionText })
  }
  return results
}

async function resolveInactivePlayerActions(
  db: Database.Database,
  provider: Provider,
  input: {
    campaignId: string
    regionId: string
    activeCharacterId: string
    sceneNarration: string
  }
): Promise<InactivePlayerActionResult[]> {
  const inactivePlayers = listInactiveLivingPlayersInRegion(
    db,
    input.campaignId,
    input.regionId,
    input.activeCharacterId
  )
  const results: InactivePlayerActionResult[] = []
  for (const inactive of inactivePlayers) {
    const context = assembleInactivePlayerContext(db, inactive.id, input.campaignId)
    const action = await decideInactivePlayerAction(provider, inactive, context, input.sceneNarration)
    appendEvent(db, {
      campaignId: input.campaignId,
      type: 'inactive_player_action',
      payload: { characterId: inactive.id, content: action.actionText }
    })
    results.push({ characterId: inactive.id, name: inactive.name, actionText: action.actionText })
  }
  return results
}

interface CheckTurnInput {
  character: Character
  intent: IntentInterpretation
  playerInput: string
  rng: RandomFn
}

interface ResolvedCheckOutcome {
  outcome: ReturnType<typeof resolveOutcome>['outcome']
  rolled: boolean
  roll: number | undefined
}

function appendPlayerAuditEvent(
  db: Database.Database,
  input: {
    campaignId: string
    characterId: string
    playerInput: string
    resolved: ResolvedCheckOutcome
  }
): void {
  appendEvent(db, {
    campaignId: input.campaignId,
    type: 'player_action',
    payload: {
      characterId: input.characterId,
      playerInput: input.playerInput,
      outcome: input.resolved.outcome,
      auditOnly: true
    }
  })
}

function appendPlayerActionExpressionEvent(
  db: Database.Database,
  input: {
    campaignId: string
    characterId: string
    playerInput: string
    actionDescription: string
  }
): void {
  appendEvent(db, {
    campaignId: input.campaignId,
    type: 'player_action_expression',
    payload: {
      characterId: input.characterId,
      playerInput: input.playerInput,
      actionDescription: wrapActionDescription(input.actionDescription)
    }
  })
}

function appendDmNarrationEvent(
  db: Database.Database,
  input: {
    campaignId: string
    characterId: string
    narrationText: string
    resolved: ResolvedCheckOutcome
  }
): void {
  appendEvent(db, {
    campaignId: input.campaignId,
    type: 'player_action',
    payload: {
      characterId: input.characterId,
      outcome: input.resolved.outcome,
      narrationText: input.narrationText
    }
  })
}

interface BeatExecutionState {
  narrationText: string
  playerActionText?: string
  narrationResult?: NarrationResult
  npcReactions: NpcReactionResult[]
  partyMemberActions: PartyMemberActionResult[]
  inactivePlayerActions: InactivePlayerActionResult[]
  sceneContext: string
  lootNarration?: string
  lootGrants?: LootGrantAccepted[]
  xpNarration?: string
  xpAmount?: number
  leveledUp?: boolean
  levelsGained?: number
  encounterXpRan?: boolean
}

async function executeNpcResponseBeat(
  db: Database.Database,
  provider: Provider,
  beat: Extract<TurnBeat, { kind: 'npcResponse' }>,
  input: {
    campaignId: string
    player: Character
    rng: RandomFn
    state: BeatExecutionState
  }
): Promise<void> {
  for (const npcId of beat.npcIds) {
    const reaction = await resolveTargetedNpcReaction(db, provider, {
      campaignId: input.campaignId,
      player: input.player,
      npcId,
      sceneNarration: input.state.sceneContext,
      rng: input.rng
    })
    if (reaction) {
      input.state.npcReactions.push(reaction)
    }
  }
}

async function applyQuestRewardsToBeat(
  db: Database.Database,
  provider: Provider,
  input: {
    campaignId: string
    regionId: string
    character: Character
    narrationResult: NarrationResult
    previousThreadState?: string
    state: BeatExecutionState
  }
): Promise<void> {
  const update = input.narrationResult.storyThreadUpdate
  if (!update || !input.previousThreadState) {
    return
  }
  await applyQuestRewardsToBeatState(db, provider, {
    campaignId: input.campaignId,
    regionId: input.regionId,
    character: input.character,
    threadId: update.threadId,
    previousThreadState: input.previousThreadState,
    newThreadState: update.state,
    state: input.state
  })
}

async function executeDmNarrationBeat(
  db: Database.Database,
  provider: Provider,
  input: {
    campaignId: string
    regionId: string
    character: Character
    resolved: ResolvedCheckOutcome
    narrationContext: ReturnType<typeof assembleNarrationContext>
    state: BeatExecutionState
  }
): Promise<void> {
  const narrationResult = await narrate(provider, input.resolved.outcome, input.narrationContext)
  let previousThreadState: string | undefined
  if (narrationResult.storyThreadUpdate) {
    const threads = listStoryThreadsByCampaign(db, input.campaignId)
    previousThreadState = threads.find((t) => t.id === narrationResult.storyThreadUpdate!.threadId)?.state
  }
  persistNarrationSideEffects(db, narrationResult, {
    campaignId: input.campaignId,
    regionId: input.regionId,
    characterId: input.character.id
  })
  await applyQuestRewardsToBeat(db, provider, { ...input, narrationResult, previousThreadState })
  appendDmNarrationEvent(db, {
    campaignId: input.campaignId,
    characterId: input.character.id,
    narrationText: narrationResult.narrationText,
    resolved: input.resolved
  })
  input.state.narrationResult = narrationResult
  if (!input.state.lootNarration) {
    input.state.narrationText = narrationResult.narrationText
  }
  input.state.sceneContext = input.state.sceneContext
    ? `${input.state.sceneContext} ${input.state.narrationText}`
    : input.state.narrationText
}

function executePlayerActionExpressionBeat(
  db: Database.Database,
  beat: Extract<TurnBeat, { kind: 'playerActionExpression' }>,
  input: {
    campaignId: string
    character: Character
    playerInput: string
    state: BeatExecutionState
  }
): void {
  const wrapped = wrapActionDescription(beat.actionDescription)
  const expressed = stripActionMarkers(wrapped)
  appendPlayerActionExpressionEvent(db, {
    campaignId: input.campaignId,
    characterId: input.character.id,
    playerInput: input.playerInput,
    actionDescription: beat.actionDescription
  })
  input.state.playerActionText = expressed
  input.state.sceneContext = input.state.sceneContext
    ? `${input.state.sceneContext} ${expressed}`
    : expressed
}

async function executePartyMemberBeat(
  db: Database.Database,
  provider: Provider,
  input: {
    activeCharacterId: string
    state: BeatExecutionState
  }
): Promise<void> {
  const actions = await resolvePartyMemberActions(
    db,
    provider,
    input.activeCharacterId,
    input.state.sceneContext
  )
  input.state.partyMemberActions.push(...actions)
}

async function executeInactivePlayerEncounter(
  db: Database.Database,
  provider: Provider,
  input: {
    campaignId: string
    regionId: string
    activeCharacterId: string
    state: BeatExecutionState
  }
): Promise<void> {
  if (!input.state.sceneContext.trim()) {
    return
  }
  const actions = await resolveInactivePlayerActions(db, provider, {
    campaignId: input.campaignId,
    regionId: input.regionId,
    activeCharacterId: input.activeCharacterId,
    sceneNarration: input.state.sceneContext
  })
  input.state.inactivePlayerActions.push(...actions)
  for (const action of actions) {
    input.state.sceneContext = `${input.state.sceneContext} ${action.actionText}`
  }
}

async function executeRoutingBeats(
  db: Database.Database,
  provider: Provider,
  plan: TurnRoutingPlan,
  input: {
    campaignId: string
    regionId: string
    character: Character
    playerInput: string
    resolved: ResolvedCheckOutcome
    narrationContext: ReturnType<typeof assembleNarrationContext>
    rng: RandomFn
  }
): Promise<BeatExecutionState> {
  const state: BeatExecutionState = {
    narrationText: '',
    npcReactions: [],
    partyMemberActions: [],
    inactivePlayerActions: [],
    sceneContext: ''
  }

  for (const beat of plan.beats) {
    if (beat.kind === 'playerActionExpression') {
      executePlayerActionExpressionBeat(db, beat, {
        campaignId: input.campaignId,
        character: input.character,
        playerInput: input.playerInput,
        state
      })
    } else if (beat.kind === 'dmNarration') {
      await executeDmNarrationBeat(db, provider, { ...input, state })
    } else if (beat.kind === 'npcResponse') {
      await executeNpcResponseBeat(db, provider, beat, {
        campaignId: input.campaignId,
        player: input.character,
        rng: input.rng,
        state
      })
    } else if (beat.kind === 'partyMember') {
      await executePartyMemberBeat(db, provider, { activeCharacterId: input.character.id, state })
    }
  }

  await executeInactivePlayerEncounter(db, provider, {
    campaignId: input.campaignId,
    regionId: input.regionId,
    activeCharacterId: input.character.id,
    state
  })

  return state
}

async function resolveRoutedTurn(
  db: Database.Database,
  provider: Provider,
  campaignId: string,
  turn: CheckTurnInput
): Promise<TurnResult> {
  const { character, intent, playerInput, rng } = turn
  const resolved = resolveOutcome(character, intent, rng)
  const regionId = getCurrentRegionId(db, campaignId, character)
  const narrationContext = assembleNarrationContext({
    db,
    campaignId,
    regionId,
    characterId: character.id,
    playerInput
  })
  const routingPlan = await reviewTurn(provider, {
    ...narrationContext,
    intent,
    checkOutcome: resolved.rolled ? resolved.outcome : undefined
  })

  appendPlayerAuditEvent(db, { campaignId, characterId: character.id, playerInput, resolved })

  const state = await executeRoutingBeats(db, provider, routingPlan, {
    campaignId,
    regionId,
    character,
    playerInput,
    resolved,
    narrationContext,
    rng
  })

  createSaveSnapshot(db, campaignId)
  return buildRoutedTurnResult(db, character.id, resolved, state)
}

function buildRoutedTurnResult(
  db: Database.Database,
  characterId: string,
  resolved: ResolvedCheckOutcome,
  state: BeatExecutionState
): TurnResult {
  return {
    narrationText: state.narrationText,
    playerActionText: state.playerActionText,
    check: resolved.rolled
      ? {
          roll: resolved.roll as number,
          total: resolved.outcome.total,
          dc: resolved.outcome.dc,
          success: resolved.outcome.success
        }
      : undefined,
    npcReactions: state.npcReactions,
    partyMemberActions: state.partyMemberActions,
    inactivePlayerActions: state.inactivePlayerActions,
    proposedPromotion: resolveProposedPromotion(db, state.narrationResult?.proposedPromotionNpcId),
    lootNarration: state.lootNarration,
    lootGrants: state.lootGrants,
    xpNarration: state.xpNarration,
    xpAmount: state.xpAmount,
    leveledUp: state.leveledUp,
    levelsGained: state.levelsGained,
    ...buildTurnResultExtras(db, characterId, state.narrationResult?.commitAlignmentShift?.newAlignment)
  }
}

function resolveProposedPromotion(
  db: Database.Database,
  npcId: string | undefined
): ProposedPromotion | undefined {
  if (!npcId) {
    return undefined
  }
  const npc = getNpcById(db, npcId)
  return npc ? { npcId: npc.id, npcName: npc.name } : undefined
}

function resolveDyingTurnIfNeeded(
  db: Database.Database,
  campaignId: string,
  character: Character,
  rng: RandomFn
): TurnResult | undefined {
  const priorDying = progressDyingSequence(db, campaignId, character, rng)
  if (!priorDying) {
    return undefined
  }
  appendEvent(db, {
    campaignId,
    type: 'dying_resolution',
    payload: {
      characterId: character.id,
      status: priorDying.status,
      narrationText: priorDying.message
    }
  })
  createSaveSnapshot(db, campaignId)
  return {
    narrationText: priorDying.message,
    npcReactions: [],
    partyMemberActions: [],
    inactivePlayerActions: [],
    dyingResolution: priorDying,
    ...buildTurnResultExtras(db, character.id)
  }
}

async function resolveCombatPlayerTurn(input: {
  db: Database.Database
  provider: Provider
  turnInput: TurnInput
  character: Character
  intent: Awaited<ReturnType<typeof interpretIntent>>
  rng: RandomFn
}): Promise<TurnResult> {
  const { db, provider, turnInput, character, intent, rng } = input
  const regionId = getCurrentRegionId(db, turnInput.campaignId, character)
  const combatResult = await resolveCombatTurn({
    db,
    provider,
    campaignId: turnInput.campaignId,
    character,
    regionId,
    intent,
    playerInput: turnInput.playerInput,
    rng
  })
  return { ...combatResult, ...buildTurnResultExtras(db, character.id) }
}

async function resolveIntentRoutedTurn(input: {
  db: Database.Database
  provider: Provider
  turnInput: TurnInput
  character: Character
  intent: Awaited<ReturnType<typeof interpretIntent>>
  rng: RandomFn
}): Promise<TurnResult> {
  const { db, provider, turnInput, character, intent, rng } = input
  if (intent.actionType === 'restShort' || intent.actionType === 'restLong') {
    return resolveRestTurn(db, {
      campaignId: turnInput.campaignId,
      character,
      kind: intent.actionType,
      playerInput: turnInput.playerInput
    })
  }
  if (intent.actionType === 'travel') {
    return resolveTravelTurnWithDestination(
      db,
      provider,
      {
        campaignId: turnInput.campaignId,
        estimatedDays: intent.travelDays ?? 1,
        playerInput: turnInput.playerInput,
        characterId: character.id
      },
      intent
    )
  }
  if (intent.actionType === 'modifyItem') {
    return resolveModificationTurn({
      db,
      provider,
      campaignId: turnInput.campaignId,
      character,
      playerInput: turnInput.playerInput
    })
  }
  return resolveRoutedTurn(db, provider, turnInput.campaignId, {
    character,
    intent,
    playerInput: turnInput.playerInput,
    rng
  })
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

  assertNoPendingLevelUp(db, turnInput.characterId)

  const dyingTurn = resolveDyingTurnIfNeeded(db, turnInput.campaignId, character, rng)
  if (dyingTurn) {
    return dyingTurn
  }

  const intent = await interpretIntent(
    provider,
    turnInput.playerInput,
    buildCombatIntentContext(db, turnInput.campaignId, character.id, getCurrentRegionId(db, turnInput.campaignId, character))
  )

  if (shouldRouteToCombat(db, turnInput.campaignId, character.id, intent)) {
    try {
      return await resolveCombatPlayerTurn({ db, provider, turnInput, character, intent, rng })
    } catch (error) {
      if (error instanceof CombatTurnError) {
        throw error
      }
      throw error
    }
  }

  return resolveIntentRoutedTurn({ db, provider, turnInput, character, intent, rng })
}

export function registerTurnHandlers(): void {
  ipcMain.handle('turn:resolve', (_event, input: TurnInput) =>
    resolvePlayerTurn(getDb(), buildAgentProvider(), input, Math.random)
  )
  ipcMain.handle('turn:generateObituary', (_event, input: GenerateObituaryInput) =>
    generateObituaryForDeath(getDb(), buildAgentProvider(), input)
  )
}
