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
  type NarrationContext,
  type NarrationResult
} from '../agents/dm'
import { ensureExecutableRoutingPlan, interpretIntentAndRoute } from '../agents/intentAndRoute'
import {
  canSkipRoutingLlm,
  heuristicRoutingPlan,
  type TurnRoutingSignals
} from '../agents/turnRoutingHeuristic'
import type { TurnBeat, TurnRoutingPlan } from '../shared/turnRouting/types'
import type { Provider } from '../agents/providers/types'
import {
  createCreatureTokenSchedulerDeps,
  maybeEnqueueCreatureTokenAfterSpeciesCreate
} from './creatureTokenScheduler'
import { computeCharacterTotalAc, type CommerceSideEffect } from '../db/repositories/itemCommerce'
import { isNaturalTwenty, resolveDamage, type DamageRoll } from '../engine/damage'
import { DC_MIN, resolveCheck, rollD20 } from '../engine/checks'
import { resolveModificationTurn } from './modificationTurn'
import { capSceneContextForPrompt } from './sceneContextCap'
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
import { setOpeningScene } from '../db/repositories/guidedCreation'
import { appendEvent } from '../db/repositories/events'
import { appendNpcMemory, listNpcMemoriesByNpc } from '../db/repositories/npcMemories'
import { recordNpcPlayerInteraction } from './npcInteractionWatermark'
import { getNpcById } from '../db/repositories/npcs'
import { getRegionById, listRegionsByCampaign } from '../db/repositories/regions'
import {
  createCampaignActionTurnId,
  logCampaignAction,
  runWithCampaignActionTrace
} from './campaignActionTrace'
import { listStoryThreadsByCampaign } from '../db/repositories/storyThreads'
import { applyNarrationQuestRewards } from './narrationQuestRewards'
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
import { resolveCombatTurn, shouldRouteToCombat } from './combatTurn'
import { generateObituaryForDeath, type GenerateObituaryInput } from './obituaryIpc'
import type { CombatAttackResult, CombatStateSnapshot } from '../shared/combat/types'
import type { FleeTurnOutcome } from '../shared/combat/flee/types'
import { applyCatalogSpellLockout, tryBlockLockedAction } from './turnLockoutPlay'

export interface TurnInput {
  campaignId: string
  characterId: string
  playerInput: string
  /** Optional DEV correlation id from the renderer (`[campaignAction]` traces). */
  clientTraceId?: string
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
  commerceEffect?: CommerceSideEffect
  purchaseRejected?: boolean
  /** Soft-reject / status when Action lockout blocks this turn. */
  lockoutNarration?: string
  /** Newly learned spell names for player-visible grant feedback. */
  spellGrantNarration?: string
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
    payload: {
      characterId: character.id,
      kind,
      hpRestored: rest.hpRestored,
      narrationText,
      playerInput,
      dmLineKind: 'scene'
    }
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
    payload: { days, narrationText, playerInput, characterId, destinationRegionId, dmLineKind: 'scene' }
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

function resolveNpcAttackAgainstPlayer(
  db: Database.Database,
  player: Character,
  rng: RandomFn
): NpcAttackOutcome {
  const stats = player.stats as { abilityScores?: AbilityScores; ac?: number }
  const agility = stats.abilityScores?.agility ?? 10
  const ac = stats.ac ?? computeCharacterTotalAc(db, player.id, agility)
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
  const npcContext = await assembleNpcContext(db, npc, {
    characterId: input.player.id
  })
  const reaction = await generateNpcReaction(
    provider,
    npc,
    npcContext,
    input.sceneNarration
  )
  appendNpcMemory(db, { npcId: input.npcId, content: reaction.text, tags: [] })
  const interactionAt = new Date().toISOString()
  appendEvent(db, {
    campaignId: input.campaignId,
    type: 'npc_reaction',
    payload: {
      npcId: input.npcId,
      npcName: npc.name,
      text: reaction.text,
      reactionKind: reaction.reactionKind,
      attack: Boolean(reaction.attack)
    },
    timestamp: interactionAt
  })
  recordNpcPlayerInteraction(db, input.npcId, interactionAt)
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
    const context = await assemblePartyMemberContext(db, member.campaignId, member)
    const action = await decidePartyMemberAction(provider, member, context, sceneNarration)
    appendEvent(db, {
      campaignId: member.campaignId,
      type: 'party_member_action',
      payload: { characterId: member.id, memberName: member.name, content: action.actionText }
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
    inactivePlayers: Character[]
    sceneNarration: string
  }
): Promise<InactivePlayerActionResult[]> {
  const results: InactivePlayerActionResult[] = []
  for (const inactive of input.inactivePlayers) {
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

interface RoutedTurnInput extends CheckTurnInput {
  routingPlan: TurnRoutingPlan
  regionId: string
  narrationContext: NarrationContext
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

/** Visible Social-column line for the player's typed text (088). */
function appendPlayerUtteranceEvent(
  db: Database.Database,
  input: {
    campaignId: string
    characterId: string
    playerInput: string
  }
): void {
  const text = input.playerInput.trim()
  if (!text) {
    return
  }
  appendEvent(db, {
    campaignId: input.campaignId,
    type: 'player_action',
    payload: {
      characterId: input.characterId,
      playerInput: text
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
    dmLineKind?: 'flavor' | 'scene'
  }
): void {
  appendEvent(db, {
    campaignId: input.campaignId,
    type: 'player_action',
    payload: {
      characterId: input.characterId,
      outcome: input.resolved.outcome,
      narrationText: input.narrationText,
      dmLineKind: input.dmLineKind ?? 'flavor'
    }
  })
}

function appendDmSceneEvent(
  db: Database.Database,
  input: {
    campaignId: string
    characterId: string
    sceneText: string
  }
): void {
  setOpeningScene(db, input.characterId, input.sceneText)
  appendEvent(db, {
    campaignId: input.campaignId,
    type: 'opening_scene',
    payload: {
      characterId: input.characterId,
      narrationText: input.sceneText,
      dmLineKind: 'scene'
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
  // One entry per beat that produced scene text. Never truncated within the
  // turn — prompts receive a capped view via capSceneContextForPrompt (040.5).
  sceneContextBeats: string[]
  lootNarration?: string
  lootGrants?: LootGrantAccepted[]
  xpNarration?: string
  xpAmount?: number
  leveledUp?: boolean
  levelsGained?: number
  encounterXpRan?: boolean
  commerceEffect?: CommerceSideEffect
  rewardedQuestIds?: Set<string>
  spellGrantNarration?: string
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
      sceneNarration: capSceneContextForPrompt(input.state.sceneContextBeats),
      rng: input.rng
    })
    if (reaction) {
      input.state.npcReactions.push(reaction)
    }
  }
}

function finalizeNarrationBeatEvents(
  db: Database.Database,
  input: {
    campaignId: string
    characterId: string
    resolved: ResolvedCheckOutcome
    narrationResult: NarrationResult
    state: BeatExecutionState
  }
): void {
  const sceneUpdate = input.narrationResult.sceneUpdate?.trim()
  if (sceneUpdate) {
    appendDmSceneEvent(db, {
      campaignId: input.campaignId,
      characterId: input.characterId,
      sceneText: sceneUpdate
    })
  }
  const flavorText = input.narrationResult.narrationText.trim()
  if (flavorText) {
    appendDmNarrationEvent(db, {
      campaignId: input.campaignId,
      characterId: input.characterId,
      narrationText: flavorText,
      resolved: input.resolved,
      dmLineKind: 'flavor'
    })
  }
  input.state.narrationResult = input.narrationResult
  if (!input.state.lootNarration && flavorText) {
    input.state.narrationText = flavorText
  }
  updateBeatSceneContext(input.state, flavorText, sceneUpdate)
}

export function updateBeatSceneContext(
  state: Pick<BeatExecutionState, 'sceneContextBeats'>,
  flavorText: string,
  sceneUpdate: string | undefined
): void {
  if (!flavorText && !sceneUpdate) {
    return
  }
  state.sceneContextBeats.push(sceneUpdate ?? flavorText)
}

async function applyNarrationPersistence(
  db: Database.Database,
  input: {
    campaignId: string
    regionId: string
    characterId: string
    playerLevel: number
    provider: Provider
    narrationResult: NarrationResult
    state: BeatExecutionState
  }
): Promise<string[]> {
  const sideEffects = await persistNarrationSideEffects(db, input.narrationResult, {
    campaignId: input.campaignId,
    regionId: input.regionId,
    characterId: input.characterId,
    provider: input.provider,
    playerLevel: input.playerLevel,
    onSpeciesCreated: ({ campaignId, speciesId }) => {
      maybeEnqueueCreatureTokenAfterSpeciesCreate(createCreatureTokenSchedulerDeps(db), {
        campaignId,
        speciesId
      })
    }
  })
  if (sideEffects.commerce) {
    input.state.commerceEffect = sideEffects.commerce
  }
  if (sideEffects.spellGrantNarration) {
    input.state.spellGrantNarration = sideEffects.spellGrantNarration
  }
  return sideEffects.completedQuestIds ?? []
}

async function executeDmNarrationBeat(
  db: Database.Database,
  provider: Provider,
  input: {
    campaignId: string
    regionId: string
    character: Character
    resolved: ResolvedCheckOutcome
    narrationContext: NarrationContext
    state: BeatExecutionState
  }
): Promise<void> {
  const narrationResult = await narrate(provider, input.resolved.outcome, input.narrationContext)
  let previousThreadState: string | undefined
  if (narrationResult.storyThreadUpdate) {
    const threads = listStoryThreadsByCampaign(db, input.campaignId)
    previousThreadState = threads.find((t) => t.id === narrationResult.storyThreadUpdate!.threadId)?.state
  }
  const completedQuestIds = await applyNarrationPersistence(db, {
    campaignId: input.campaignId,
    regionId: input.regionId,
    characterId: input.character.id,
    playerLevel: input.character.level,
    provider,
    narrationResult,
    state: input.state
  })
  await applyNarrationQuestRewards({
    db,
    provider,
    campaignId: input.campaignId,
    regionId: input.regionId,
    character: input.character,
    narrationResult,
    previousThreadState,
    completedQuestIds,
    state: input.state
  })
  finalizeNarrationBeatEvents(db, {
    campaignId: input.campaignId,
    characterId: input.character.id,
    resolved: input.resolved,
    narrationResult,
    state: input.state
  })
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
  input.state.sceneContextBeats.push(expressed)
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
    capSceneContextForPrompt(input.state.sceneContextBeats)
  )
  input.state.partyMemberActions.push(...actions)
}

// === 040.5: inactive-player proxy gate =======================================
// The proxy costs one LLM call per inactive living player in the region, so it
// only fires when the turn actually crossed into their story: the routing plan
// referenced them, narration wrote cross-character log entries, or the player
// named them. Gated-off turns return empty inactivePlayerActions with no call.

interface CrossCharacterSignalInput {
  playerInput: string
  plan: TurnRoutingPlan
  narrationResult: NarrationResult | undefined
  inactivePlayers: Array<{ id: string; name: string }>
}

function inputMentionsCharacterName(playerInput: string, name: string): boolean {
  return name
    .split(/\s+/)
    .filter((token) => token.length >= 3)
    .some((token) => {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return new RegExp(`\\b${escaped}\\b`, 'i').test(playerInput)
    })
}

export function hasCrossCharacterSignal(input: CrossCharacterSignalInput): boolean {
  const inactiveIds = new Set(input.inactivePlayers.map((inactive) => inactive.id))
  const planReferencesInactive = input.plan.beats.some(
    (beat) => beat.kind === 'npcResponse' && beat.npcIds.some((id) => inactiveIds.has(id))
  )
  return (
    planReferencesInactive ||
    (input.narrationResult?.crossCharacterLogBookEntries?.length ?? 0) > 0 ||
    input.inactivePlayers.some((inactive) =>
      inputMentionsCharacterName(input.playerInput, inactive.name)
    )
  )
}

/**
 * Prompt text for the inactive-player proxy. Prefer accumulated scene beats;
 * on converse-only turns those stay empty (npcResponse never appends), so fall
 * back to NPC reaction text, then the raw player input that named them.
 */
function sceneNarrationForInactiveProxy(
  state: BeatExecutionState,
  playerInput: string
): string {
  const fromBeats = capSceneContextForPrompt(state.sceneContextBeats)
  if (fromBeats.length > 0) {
    return fromBeats
  }
  const reactionBeats = state.npcReactions
    .map((reaction) => reaction.text)
    .filter((text) => text.length > 0)
  const fromReactions = capSceneContextForPrompt(reactionBeats)
  if (fromReactions.length > 0) {
    return fromReactions
  }
  return `The active player said: ${playerInput}`
}

async function executeInactivePlayerEncounter(
  db: Database.Database,
  provider: Provider,
  input: {
    campaignId: string
    regionId: string
    activeCharacterId: string
    playerInput: string
    plan: TurnRoutingPlan
    state: BeatExecutionState
  }
): Promise<void> {
  const inactivePlayers = listInactiveLivingPlayersInRegion(
    db,
    input.campaignId,
    input.regionId,
    input.activeCharacterId
  )
  const gateInput = {
    playerInput: input.playerInput,
    plan: input.plan,
    narrationResult: input.state.narrationResult,
    inactivePlayers
  }
  // Signal gate alone decides whether to fire — empty sceneContext must not
  // skip a name-mention / plan-reference turn (converse-only npcResponse path).
  if (inactivePlayers.length === 0 || !hasCrossCharacterSignal(gateInput)) {
    return
  }
  const actions = await resolveInactivePlayerActions(db, provider, {
    campaignId: input.campaignId,
    inactivePlayers,
    sceneNarration: sceneNarrationForInactiveProxy(input.state, input.playerInput)
  })
  input.state.inactivePlayerActions.push(...actions)
  for (const action of actions) {
    input.state.sceneContextBeats.push(action.actionText)
  }
}

interface BeatLoopContext {
  campaignId: string
  regionId: string
  character: Character
  playerInput: string
  resolved: ResolvedCheckOutcome
  narrationContext: NarrationContext
  rng: RandomFn
  state: BeatExecutionState
}

async function executePlannedBeat(
  db: Database.Database,
  provider: Provider,
  beat: TurnBeat,
  ctx: BeatLoopContext
): Promise<void> {
  if (beat.kind === 'playerActionExpression') {
    executePlayerActionExpressionBeat(db, beat, {
      campaignId: ctx.campaignId,
      character: ctx.character,
      playerInput: ctx.playerInput,
      state: ctx.state
    })
  } else if (beat.kind === 'dmNarration') {
    await executeDmNarrationBeat(db, provider, ctx)
  } else if (beat.kind === 'npcResponse') {
    await executeNpcResponseBeat(db, provider, beat, {
      campaignId: ctx.campaignId,
      player: ctx.character,
      rng: ctx.rng,
      state: ctx.state
    })
  } else if (beat.kind === 'partyMember') {
    await executePartyMemberBeat(db, provider, {
      activeCharacterId: ctx.character.id,
      state: ctx.state
    })
  }
}

async function executeRoutingBeats(
  db: Database.Database,
  provider: Provider,
  plan: TurnRoutingPlan,
  input: Omit<BeatLoopContext, 'state'>
): Promise<BeatExecutionState> {
  const state: BeatExecutionState = {
    narrationText: '',
    npcReactions: [],
    partyMemberActions: [],
    inactivePlayerActions: [],
    sceneContextBeats: []
  }

  for (const beat of plan.beats) {
    await executePlannedBeat(db, provider, beat, { ...input, state })
  }

  await executeInactivePlayerEncounter(db, provider, {
    campaignId: input.campaignId,
    regionId: input.regionId,
    activeCharacterId: input.character.id,
    playerInput: input.playerInput,
    plan,
    state
  })

  return state
}

async function resolveRoutedTurn(
  db: Database.Database,
  provider: Provider,
  campaignId: string,
  turn: RoutedTurnInput
): Promise<TurnResult> {
  const { character, intent, playerInput, rng, routingPlan, regionId, narrationContext } = turn
  const resolved = resolveOutcome(character, intent, rng)

  appendPlayerAuditEvent(db, { campaignId, characterId: character.id, playerInput, resolved })
  appendPlayerUtteranceEvent(db, { campaignId, characterId: character.id, playerInput })

  const executablePlan = ensureExecutableRoutingPlan({
    plan: routingPlan,
    intent,
    presentNpcs: narrationContext.presentNpcs,
    playerInput
  })

  logCampaignAction('beats', {
    disposition: executablePlan.disposition,
    plannedBeatKinds: routingPlan.beats.map((beat) => beat.kind),
    executableBeatKinds: executablePlan.beats.map((beat) => beat.kind),
    plannedBeatCount: routingPlan.beats.length,
    executableBeatCount: executablePlan.beats.length
  })

  const state = await executeRoutingBeats(db, provider, executablePlan, {
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
    commerceEffect: state.commerceEffect,
    purchaseRejected: state.commerceEffect?.purchases.some((purchase) => !purchase.ok) ?? false,
    spellGrantNarration: state.spellGrantNarration,
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
  intent: IntentInterpretation
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

interface IntentRoutedTurnInput {
  db: Database.Database
  provider: Provider
  turnInput: TurnInput
  character: Character
  intent: IntentInterpretation
  routingPlan: TurnRoutingPlan
  regionId: string
  narrationContext: NarrationContext
  rng: RandomFn
}

async function resolveIntentRoutedTurn(input: IntentRoutedTurnInput): Promise<TurnResult> {
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
    rng,
    routingPlan: input.routingPlan,
    regionId: input.regionId,
    narrationContext: input.narrationContext
  })
}

// 040.3: pure heuristic signals assembled from DB state — the heuristic module
// itself never touches the database.
function buildTurnRoutingSignals(
  db: Database.Database,
  character: Character,
  regionId: string,
  narrationContext: NarrationContext
): TurnRoutingSignals {
  return {
    playerInput: narrationContext.playerInput,
    characterName: character.name,
    regionName: getRegionById(db, regionId)?.name ?? '',
    presentNpcs: narrationContext.presentNpcs.map((npc) => ({
      ...npc,
      interactedBefore: listNpcMemoriesByNpc(db, npc.id, 1).length > 0,
      isHostile: getNpcById(db, npc.id)?.disposition.toLowerCase().startsWith('hostile') ?? false
    })),
    activeQuestTexts: narrationContext.activeQuests.flatMap((quest) => [
      quest.title,
      quest.summary,
      ...quest.objectives.map((objective) => objective.text)
    ]),
    hasPendingAlignmentShift: narrationContext.pendingAlignmentShift !== null,
    hasPartyMembers: listPartyMembersForPlayer(db, character.id).length > 0,
    hasInactivePlayersInRegion: (narrationContext.inactiveLivingPlayersInRegion?.length ?? 0) > 0
  }
}

// Substituted when the heuristic routed an intent that bypasses beat execution
// (rest/travel/modifyItem/combat) — same inert plan the merged call returns.
const INERT_ROUTING_PLAN: TurnRoutingPlan = { disposition: 'narrate', beats: [] }

type IntentPlanResult = {
  intent: IntentInterpretation
  routingPlan: TurnRoutingPlan
  regionId: string
  narrationContext: NarrationContext
  routingSource: 'heuristic' | 'llm'
}

function intentBypassesBeatExecution(intent: IntentInterpretation): boolean {
  return intent.actionType !== undefined || (intent.combatIntent ?? 'none') !== 'none'
}

async function tryHeuristicIntentPlan(input: {
  provider: Provider
  turnInput: TurnInput
  combat: ReturnType<typeof buildCombatIntentContext>
  signals: TurnRoutingSignals
  regionId: string
  narrationContext: NarrationContext
}): Promise<IntentPlanResult | null> {
  if (input.combat.encounterActive || !canSkipRoutingLlm(input.signals)) {
    return null
  }
  const intent = await interpretIntent(input.provider, input.turnInput.playerInput, input.combat)
  const heuristicPlan = heuristicRoutingPlan(intent, input.signals)
  if (heuristicPlan) {
    return {
      intent,
      routingPlan: heuristicPlan,
      regionId: input.regionId,
      narrationContext: input.narrationContext,
      routingSource: 'heuristic'
    }
  }
  // Rest/travel/modifyItem/combat intents still use an inert plan; ordinary
  // turns must never silent-no-op — fall through to the merged LLM call.
  if (!intentBypassesBeatExecution(intent)) {
    return null
  }
  return {
    intent,
    routingPlan: INERT_ROUTING_PLAN,
    regionId: input.regionId,
    narrationContext: input.narrationContext,
    routingSource: 'heuristic'
  }
}

function intentBranchName(intent: IntentInterpretation): string {
  if (intent.actionType === 'restShort' || intent.actionType === 'restLong') {
    return intent.actionType
  }
  if (intent.actionType === 'travel') return 'travel'
  if (intent.actionType === 'modifyItem') return 'modifyItem'
  return 'routed'
}

function summarizeTurnResult(result: TurnResult): Record<string, unknown> {
  return {
    narrationChars: result.narrationText.length,
    hasPlayerActionText: Boolean(result.playerActionText?.trim()),
    npcReactionCount: result.npcReactions.length,
    partyMemberCount: result.partyMemberActions.length,
    inactivePlayerCount: result.inactivePlayerActions?.length ?? 0,
    checkSuccess: result.check?.success,
    hasCombatState: result.combatState != null
  }
}

// 040.2: one merged LLM call produces intent + routing plan. Combat and
// rest/travel/modifyItem turns simply never execute the plan half.
// 040.3: when pre-LLM signals already prove the routing plan, the turn drops
// to the slimmer intent-only prompt and a deterministic heuristic plan.
async function interpretTurnIntentAndPlan(
  db: Database.Database,
  provider: Provider,
  turnInput: TurnInput,
  character: Character
): Promise<IntentPlanResult> {
  const regionId = getCurrentRegionId(db, turnInput.campaignId, character)
  const narrationContext = await assembleNarrationContext({
    db,
    campaignId: turnInput.campaignId,
    regionId,
    characterId: character.id,
    playerInput: turnInput.playerInput
  })
  const combat = buildCombatIntentContext(db, turnInput.campaignId, character.id, regionId)
  const signals = buildTurnRoutingSignals(db, character, regionId, narrationContext)
  const heuristicResult = await tryHeuristicIntentPlan({
    provider,
    turnInput,
    combat,
    signals,
    regionId,
    narrationContext
  })
  if (heuristicResult) {
    return heuristicResult
  }
  const { intent, routingPlan } = await interpretIntentAndRoute(provider, {
    ...narrationContext,
    combat
  })
  const heuristicPlan = !combat.encounterActive ? heuristicRoutingPlan(intent, signals) : null
  return {
    intent,
    routingPlan: heuristicPlan ?? routingPlan,
    regionId,
    narrationContext,
    routingSource: heuristicPlan ? 'heuristic' : 'llm'
  }
}

function buildLockoutBlockedTurn(
  db: Database.Database,
  characterId: string,
  message: string
): TurnResult {
  return {
    narrationText: message,
    lockoutNarration: message,
    npcReactions: [],
    partyMemberActions: [],
    inactivePlayerActions: [],
    ...buildTurnResultExtras(db, characterId)
  }
}

function applyPostTurnCatalogLockout(
  db: Database.Database,
  character: Character,
  usedCatalogSpellKey: string | undefined
): void {
  applyCatalogSpellLockout(
    db,
    getCharacterById(db, character.id) ?? character,
    usedCatalogSpellKey
  )
}

async function resolveCombatOrRoutedTurn(input: {
  db: Database.Database
  provider: Provider
  turnInput: TurnInput
  character: Character
  plan: IntentPlanResult
  rng: RandomFn
}): Promise<TurnResult> {
  if (shouldRouteToCombat(input.db, input.turnInput.campaignId, input.character.id, input.plan.intent)) {
    const combatResult = await resolveTracedCombatTurn({
      db: input.db,
      provider: input.provider,
      turnInput: input.turnInput,
      character: input.character,
      intent: input.plan.intent,
      rng: input.rng
    })
    applyPostTurnCatalogLockout(input.db, input.character, input.plan.intent.usedCatalogSpellKey)
    return combatResult
  }

  const routed = await resolveTracedRoutedTurn({
    db: input.db,
    provider: input.provider,
    turnInput: input.turnInput,
    character: input.character,
    plan: input.plan,
    rng: input.rng
  })
  applyPostTurnCatalogLockout(input.db, input.character, input.plan.intent.usedCatalogSpellKey)
  return routed
}

async function executeResolvedPlayerTurn(
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
    logCampaignAction('branch', { branch: 'dying' })
    logCampaignAction('complete', { branch: 'dying', ...summarizeTurnResult(dyingTurn) })
    return dyingTurn
  }

  const plan = await interpretTurnIntentAndPlan(db, provider, turnInput, character)
  logIntentRoute(plan)

  const lockoutBlock = tryBlockLockedAction(db, character, plan.intent)
  if (lockoutBlock.blocked) {
    logCampaignAction('branch', { branch: 'lockout_blocked' })
    const blocked = buildLockoutBlockedTurn(db, character.id, lockoutBlock.message)
    logCampaignAction('complete', { branch: 'lockout_blocked', ...summarizeTurnResult(blocked) })
    return blocked
  }

  return resolveCombatOrRoutedTurn({ db, provider, turnInput, character, plan, rng })
}

function logIntentRoute(plan: IntentPlanResult): void {
  logCampaignAction('intent_route', {
    source: plan.routingSource,
    actionType: plan.intent.actionType ?? null,
    combatIntent: plan.intent.combatIntent ?? 'none',
    checkNeeded: plan.intent.checkNeeded,
    disposition: plan.routingPlan.disposition,
    beatKinds: plan.routingPlan.beats.map((beat) => beat.kind),
    beatCount: plan.routingPlan.beats.length
  })
}

async function resolveTracedCombatTurn(input: {
  db: Database.Database
  provider: Provider
  turnInput: TurnInput
  character: Character
  intent: IntentInterpretation
  rng: RandomFn
}): Promise<TurnResult> {
  logCampaignAction('branch', { branch: 'combat' })
  const combatResult = await resolveCombatPlayerTurn(input)
  logCampaignAction('complete', { branch: 'combat', ...summarizeTurnResult(combatResult) })
  return combatResult
}

async function resolveTracedRoutedTurn(input: {
  db: Database.Database
  provider: Provider
  turnInput: TurnInput
  character: Character
  plan: IntentPlanResult
  rng: RandomFn
}): Promise<TurnResult> {
  const branch = intentBranchName(input.plan.intent)
  logCampaignAction('branch', { branch })
  const result = await resolveIntentRoutedTurn({
    db: input.db,
    provider: input.provider,
    turnInput: input.turnInput,
    character: input.character,
    intent: input.plan.intent,
    routingPlan: input.plan.routingPlan,
    regionId: input.plan.regionId,
    narrationContext: input.plan.narrationContext,
    rng: input.rng
  })
  logCampaignAction('complete', { branch, ...summarizeTurnResult(result) })
  return result
}

export async function resolvePlayerTurn(
  db: Database.Database,
  provider: Provider,
  turnInput: TurnInput,
  rng: RandomFn
): Promise<TurnResult> {
  const turnId = turnInput.clientTraceId?.trim() || createCampaignActionTurnId()
  return runWithCampaignActionTrace(
    {
      turnId,
      campaignId: turnInput.campaignId,
      characterId: turnInput.characterId
    },
    async () => {
      logCampaignAction('ipc_start', { playerInput: turnInput.playerInput })
      try {
        return await executeResolvedPlayerTurn(db, provider, turnInput, rng)
      } catch (error) {
        logCampaignAction('error', {
          error: error instanceof Error ? error.message : String(error)
        })
        throw error
      }
    }
  )
}

export function registerTurnHandlers(): void {
  ipcMain.handle('turn:resolve', (_event, input: TurnInput) =>
    resolvePlayerTurn(getDb(), buildAgentProvider(), input, Math.random)
  )
  ipcMain.handle('turn:generateObituary', (_event, input: GenerateObituaryInput) =>
    generateObituaryForDeath(getDb(), buildAgentProvider(), input)
  )
}
