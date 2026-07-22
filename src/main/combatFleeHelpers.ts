import type Database from 'better-sqlite3'
import type { RandomFn } from '../engine/abilities'
import { resolveFleeDisengage } from '../engine/fleeDisengage'
import { conditionsFromStats } from '../engine/conditions'
import { proficiencyBonus } from '../engine/proficiency'
import { judgeEscapeNarration } from '../agents/fleeNarration'
import type { Provider } from '../agents/providers/types'
import type { Character } from '../db/repositories/characters'
import { getCharacterById } from '../db/repositories/characters'
import { appendEvent } from '../db/repositories/events'
import {
  getActiveEncounter,
  markCombatantExited,
  setEncounterPursuitState,
  type CombatEncounter
} from '../db/repositories/combatEncounters'
import { getNpcById, isHostileNpc, isNpcOutOfFight } from '../db/repositories/npcs'
import { getRegionById } from '../db/repositories/regions'
import type { CombatantRef } from '../shared/combat/types'
import { fleeExpositionCopy, type FleeTurnOutcome } from '../shared/combat/flee/types'
import {
  advanceEncounterTurn,
  appendCombatTurnAdvanced,
  allHostilesDefeated,
  finalizeEncounter
} from './combatOrchestration'
import { buildCombatStateSnapshot, summarizeHostilesInEncounter } from './combatSnapshot'
import { enrichTurnWithEncounterRewards } from './progressionPipeline'
import { encounterEligibleForRewards } from './encounterRewards'
import type { TurnResult } from './turnIpc'
import { markOwnedCompanionsExitedOnFlee } from './companionFleeFollow'

const DEFAULT_AGILITY_SCORE = 10
const DEFAULT_ATTACK_BONUS = 0

export interface ThreateningHostile {
  npcId: string
  name: string
  attackBonus: number
  agilityScore: number
}

function npcToThreateningHostile(db: Database.Database, npcId: string): ThreateningHostile | undefined {
  const npc = getNpcById(db, npcId)
  if (!npc || !isHostileNpc(npc) || isNpcOutOfFight(npc)) {
    return undefined
  }
  const row = db
    .prepare('SELECT attack_bonus FROM npcs WHERE id = ?')
    .get(npc.id) as { attack_bonus: number | null } | undefined
  return {
    npcId: npc.id,
    name: npc.name,
    attackBonus: row?.attack_bonus ?? DEFAULT_ATTACK_BONUS,
    agilityScore: DEFAULT_AGILITY_SCORE
  }
}

function isBetterThreat(candidate: ThreateningHostile, best: ThreateningHostile | undefined): boolean {
  if (!best) {
    return true
  }
  if (candidate.attackBonus > best.attackBonus) {
    return true
  }
  return candidate.attackBonus === best.attackBonus && candidate.npcId < best.npcId
}

export function selectThreateningHostile(
  db: Database.Database,
  encounter: CombatEncounter
): ThreateningHostile | undefined {
  let best: ThreateningHostile | undefined
  for (const participant of encounter.participantIds) {
    if (participant.kind !== 'npc') {
      continue
    }
    const candidate = npcToThreateningHostile(db, participant.id)
    if (candidate && isBetterThreat(candidate, best)) {
      best = candidate
    }
  }
  return best
}

export function rollFleeDisengageCheck(character: Character, hostile: ThreateningHostile, rng: RandomFn) {
  const abilityScores = (character.stats as { abilityScores?: { agility?: number } }).abilityScores
  return resolveFleeDisengage({
    rng,
    playerAgilityScore: abilityScores?.agility ?? DEFAULT_AGILITY_SCORE,
    playerProficient: true,
    proficiencyBonus: proficiencyBonus(character.level),
    hostileAgilityScore: hostile.agilityScore,
    playerConditions: conditionsFromStats(character.stats)
  })
}

interface FleeResultInput {
  db: Database.Database
  characterId: string
  encounter: CombatEncounter
  fleeOutcome: FleeTurnOutcome
  catchUp: Pick<TurnResult, 'npcReactions' | 'partyMemberActions'>
}

function buildFleeResult(input: FleeResultInput): TurnResult {
  const { db, characterId, encounter, fleeOutcome, catchUp } = input
  const character = getCharacterById(db, characterId)
  const combatState =
    encounter.phase === 'active' ? buildCombatStateSnapshot(db, encounter, characterId) : null
  return {
    narrationText: fleeExpositionCopy(fleeOutcome.phase, fleeOutcome.narrationText),
    npcReactions: catchUp.npcReactions,
    partyMemberActions: catchUp.partyMemberActions,
    fleeOutcome,
    combatState,
    hpAfter: character?.hp,
    pendingAlignmentShift: character?.pendingAlignmentShift ?? null
  }
}

export async function resolveFailedFleeTurn(input: {
  db: Database.Database
  campaignId: string
  characterId: string
  encounter: CombatEncounter
  hostile: ThreateningHostile
  check: ReturnType<typeof resolveFleeDisengage>
  runCatchUp: (encounter: CombatEncounter) => Promise<Pick<TurnResult, 'npcReactions' | 'partyMemberActions'>>
}): Promise<{ encounter: CombatEncounter; result: TurnResult }> {
  const { db, campaignId, characterId, hostile, check, runCatchUp } = input
  let encounter = input.encounter
  setEncounterPursuitState(db, encounter.id, 'engaged')
  encounter = advanceEncounterTurn(db, encounter)
  appendCombatTurnAdvanced(db, encounter)
  const catchUp = await runCatchUp(encounter)
  encounter = getActiveEncounter(db, campaignId) ?? encounter
  const fleeOutcome: FleeTurnOutcome = {
    phase: 'failed',
    disengageCheck: check,
    narrationText: `${hostile.name} cuts off your escape — you are still in the fight.`
  }
  return {
    encounter,
    result: buildFleeResult({ db, characterId, encounter, fleeOutcome, catchUp })
  }
}

async function resolveEscapedFleeTurn(input: {
  db: Database.Database
  provider: Provider
  campaignId: string
  characterId: string
  playerRef: CombatantRef
  encounter: CombatEncounter
  check: ReturnType<typeof resolveFleeDisengage>
  narrationText: string
  runCatchUp: (encounter: CombatEncounter) => Promise<Pick<TurnResult, 'npcReactions' | 'partyMemberActions'>>
}): Promise<{ encounter: CombatEncounter; result: TurnResult }> {
  const { db, provider, campaignId, characterId, playerRef, check, narrationText, runCatchUp } = input
  let encounter = input.encounter
  markCombatantExited(db, encounter.id, playerRef, encounter.exitedCombatantIds)
  encounter = getActiveEncounter(db, campaignId) ?? encounter
  markOwnedCompanionsExitedOnFlee(db, encounter, characterId)
  setEncounterPursuitState(db, encounter.id, 'engaged')
  encounter = getActiveEncounter(db, campaignId) ?? encounter
  const catchUp = await runCatchUp(encounter)
  encounter = getActiveEncounter(db, campaignId) ?? encounter
  if (encounter.phase === 'active' && allHostilesDefeated(db, encounter)) {
    encounter = finalizeEncounter(db, encounter, 'defeated')
  }
  const fleeOutcome: FleeTurnOutcome = { phase: 'escaped', disengageCheck: check, narrationText }
  let result = buildFleeResult({ db, characterId, encounter, fleeOutcome, catchUp })
  if (encounterEligibleForRewards(encounter)) {
    const character = getCharacterById(db, characterId)
    const regionId =
      (character?.stats as { currentRegionId?: string } | undefined)?.currentRegionId ?? ''
    result = await enrichTurnWithEncounterRewards({
      db,
      provider,
      encounter,
      campaignId,
      playerCharacterId: characterId,
      regionId,
      base: result
    })
  }
  return { encounter, result }
}

async function judgeFleeEscape(input: {
  provider: Provider
  check: ReturnType<typeof resolveFleeDisengage>
  regionId: string
  db: Database.Database
  encounter: CombatEncounter
  repeatAttempt: boolean
}) {
  const region = getRegionById(input.db, input.regionId)
  return judgeEscapeNarration(input.provider, {
    checkResult: input.check,
    regionDescription: region?.description ?? 'Unknown scene',
    hostileSummary: summarizeHostilesInEncounter(input.db, input.encounter),
    repeatAttempt: input.repeatAttempt
  })
}

export async function resolveSuccessfulFleeTurn(input: {
  db: Database.Database
  provider: Provider
  campaignId: string
  characterId: string
  regionId: string
  encounter: CombatEncounter
  check: ReturnType<typeof resolveFleeDisengage>
  playerRef: CombatantRef
  runCatchUp: (
    encounter: CombatEncounter
  ) => Promise<Pick<TurnResult, 'npcReactions' | 'partyMemberActions'>>
}): Promise<TurnResult> {
  const { db, provider, campaignId, characterId, regionId, encounter, check, playerRef, runCatchUp } = input
  setEncounterPursuitState(db, encounter.id, 'pursued')
  const judgment = await judgeFleeEscape({
    provider,
    check,
    regionId,
    db,
    encounter,
    repeatAttempt: encounter.pursuitState === 'pursued'
  })
  appendEvent(db, {
    campaignId,
    type: 'flee_escape_judgment',
    payload: { characterId, check, judgment }
  })

  if (judgment.outcome === 'escaped') {
    return (
      await resolveEscapedFleeTurn({
        db,
        provider,
        campaignId,
        characterId,
        playerRef,
        encounter,
        check,
        narrationText: judgment.narrationText,
        runCatchUp
      })
    ).result
  }
  return buildPursuedFleeResult({ db, campaignId, characterId, encounter, check, narrationText: judgment.narrationText })
}

function buildPursuedFleeResult(input: {
  db: Database.Database
  campaignId: string
  characterId: string
  encounter: CombatEncounter
  check: ReturnType<typeof resolveFleeDisengage>
  narrationText: string
}): TurnResult {
  const fleeOutcome: FleeTurnOutcome = {
    phase: 'pursued',
    disengageCheck: input.check,
    narrationText: input.narrationText
  }
  const activeEncounter = getActiveEncounter(input.db, input.campaignId) ?? input.encounter
  return buildFleeResult({
    db: input.db,
    characterId: input.characterId,
    encounter: activeEncounter,
    fleeOutcome,
    catchUp: { npcReactions: [], partyMemberActions: [] }
  })
}
