import type Database from 'better-sqlite3'
import { canAct } from '../engine/conditions'
import { getActiveEncounter, isPlayerCombatTurn } from '../db/repositories/combatEncounters'
import { getNpcById, updateNpcDisposition } from '../db/repositories/npcs'
import { getCharacterById, type Character } from '../db/repositories/characters'
import type { IntentInterpretation } from '../agents/dm'
import type { CombatAttackResult } from '../shared/combat/types'
import { PROVOKE_HOSTILE_DISPOSITION } from '../shared/npcCombat/types'
import {
  allHostilesDefeated,
  finalizeEncounter,
  startEncounter
} from './combatOrchestration'
import { playerHasExitedEncounter } from './combatFlee'
import { resolveNonPlayerCatchUp } from './combatResolvers'
import { buildCombatStateSnapshot } from './combatSnapshot'
import { reloadEncounter, resolveAttackBranch, resolveEndBranch, resolveFleeBranch } from './combatTurnPhases'
import { resolveDefeatDispositionBeat } from './combatDefeatBeat'
import { enrichTurnWithEncounterRewards } from './progressionPipeline'
import type { TurnResult } from './turnIpc'
import { createSaveSnapshot } from '../db/repositories/saves'
import { CombatTurnError } from './combatErrors'
import type { CombatTurnInput } from './combatTurnTypes'

export type { CombatTurnInput } from './combatTurnTypes'
export { CombatTurnError }

function provokeListedNpcs(db: Database.Database, npcIds: string[] | undefined): void {
  for (const npcId of npcIds ?? []) {
    const target = getNpcById(db, npcId)
    if (target && !target.disposition.toLowerCase().startsWith('hostile')) {
      updateNpcDisposition(db, npcId, PROVOKE_HOSTILE_DISPOSITION)
    }
  }
}

function playerCanTakeCombatAction(character: Character): boolean {
  const conditions = (character.stats as { conditions?: string[] }).conditions ?? []
  return canAct(conditions as never[]) && character.hp > 0
}

function assertPlayerAttackAllowed(encounter: import('../db/repositories/combatEncounters').CombatEncounter, character: Character): void {
  if (!isPlayerCombatTurn(encounter, character.id)) {
    throw new CombatTurnError('It is not your turn')
  }
  if (!playerCanTakeCombatAction(character)) {
    throw new CombatTurnError('You cannot act while unconscious')
  }
}

async function resolveAttackIfNeeded(
  input: CombatTurnInput,
  encounter: import('../db/repositories/combatEncounters').CombatEncounter
): Promise<{ encounter: import('../db/repositories/combatEncounters').CombatEncounter; lastAttack?: CombatAttackResult; npcYieldOutcome?: import('../shared/combat/types').NpcYieldOutcome; yieldNarrationHint?: string }> {
  if (input.intent.combatIntent !== 'attack') {
    return { encounter }
  }
  assertPlayerAttackAllowed(encounter, input.character)
  const attack = await resolveAttackBranch(input, encounter)
  return { encounter: attack.encounter, lastAttack: attack.lastAttack, npcYieldOutcome: attack.npcYieldOutcome, yieldNarrationHint: attack.yieldNarrationHint }
}

async function buildCombatTurnResult(input: {
  db: Database.Database
  provider: CombatTurnInput['provider']
  campaignId: string
  character: Character
  regionId: string
  encounter: import('../db/repositories/combatEncounters').CombatEncounter
  attackPhase: Awaited<ReturnType<typeof resolveAttackIfNeeded>>
  catchUp: Awaited<ReturnType<typeof resolveNonPlayerCatchUp>>
}): Promise<TurnResult> {
  const { db, provider, campaignId, character, regionId, encounter, attackPhase, catchUp } = input
  const combatState = encounter.phase === 'active' ? buildCombatStateSnapshot(db, encounter, character.id) : null
  const defeatBeat = await resolveDefeatDispositionBeat({ db, provider, campaignId, character, catchUp })
  const base: TurnResult = {
    narrationText: catchUp.narration,
    npcReactions: catchUp.npcReactions,
    partyMemberActions: catchUp.partyMemberActions,
    combatAttack: attackPhase.lastAttack,
    combatState,
    hpAfter: getCharacterById(db, character.id)?.hp,
    npcYieldOutcome: attackPhase.npcYieldOutcome,
    yieldNarrationHint: attackPhase.yieldNarrationHint,
    ...defeatBeat,
    pendingAlignmentShift: null
  }
  if (encounter.phase !== 'resolved' || encounter.outcome !== 'defeated') {
    return base
  }
  return enrichTurnWithEncounterRewards({
    db,
    provider,
    encounter,
    campaignId,
    playerCharacterId: character.id,
    regionId,
    base
  })
}

async function beginEncounterIfRequested(
  input: CombatTurnInput
): Promise<import('../db/repositories/combatEncounters').CombatEncounter | undefined> {
  const { db, provider, campaignId, character, regionId, intent, rng } = input
  const existing = getActiveEncounter(db, campaignId)
  if (intent.combatIntent !== 'startEncounter' || existing) {
    return existing ?? undefined
  }
  provokeListedNpcs(db, intent.participantNpcIds)
  return startEncounter({
    db,
    campaignId,
    regionId,
    player: character,
    participantNpcIds: intent.participantNpcIds,
    playerInput: input.playerInput,
    provider,
    rng
  })
}

export async function resolveCombatTurn(input: CombatTurnInput): Promise<TurnResult> {
  const { db, provider, campaignId, character, regionId, intent, rng } = input
  let encounter = await beginEncounterIfRequested(input)
  if (!encounter) {
    throw new CombatTurnError('No active encounter for combat action')
  }
  if (intent.combatIntent === 'endEncounter') {
    return resolveEndBranch(db, encounter, character.id)
  }
  if (intent.combatIntent === 'flee') {
    return resolveFleeBranch(input, encounter)
  }

  const attackPhase = await resolveAttackIfNeeded(input, encounter)
  encounter = attackPhase.encounter
  const catchUp = await resolveNonPlayerCatchUp({
    db,
    provider,
    campaignId,
    player: character,
    encounter: reloadEncounter(db, campaignId),
    rng
  })
  encounter = reloadEncounter(db, campaignId)
  if (allHostilesDefeated(db, encounter)) {
    encounter = finalizeEncounter(db, encounter, 'defeated')
  }
  createSaveSnapshot(db, campaignId)
  return buildCombatTurnResult({
    db,
    provider,
    campaignId,
    character,
    regionId,
    encounter,
    attackPhase,
    catchUp
  })
}

export function shouldRouteToCombat(
  db: Database.Database,
  campaignId: string,
  characterId: string,
  intent: IntentInterpretation
): boolean {
  if (playerHasExitedEncounter(db, campaignId, characterId)) {
    return intent.combatIntent === 'startEncounter'
  }
  if (getActiveEncounter(db, campaignId)) {
    return true
  }
  return intent.combatIntent === 'startEncounter'
}
