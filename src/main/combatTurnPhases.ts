import type Database from 'better-sqlite3'
import { isPlayerCombatTurn, getActiveEncounter, type CombatEncounter } from '../db/repositories/combatEncounters'
import { getCharacterById } from '../db/repositories/characters'
import { finalizeEncounter, advanceEncounterTurn, appendCombatTurnAdvanced } from './combatOrchestration'
import { resolveFleeInCombatTurn } from './combatFlee'
import { resolveNonPlayerCatchUp, resolvePlayerAttack, resolveYieldReview } from './combatResolvers'
import type { CombatTurnInput } from './combatTurnTypes'
import type { TurnResult } from './turnIpc'
import { createSaveSnapshot } from '../db/repositories/saves'
import { CombatTurnError } from './combatErrors'
import type { CombatAttackResult, NpcYieldOutcome } from '../shared/combat/types'

export function reloadEncounter(db: Database.Database, campaignId: string): CombatEncounter {
  const encounter = getActiveEncounter(db, campaignId)
  if (!encounter) {
    throw new CombatTurnError('No active encounter')
  }
  return encounter
}

export async function resolveFleeBranch(
  input: CombatTurnInput,
  encounter: CombatEncounter
): Promise<TurnResult> {
  if (!isPlayerCombatTurn(encounter, input.character.id)) {
    throw new CombatTurnError('It is not your turn')
  }
  const fleeResult = await resolveFleeInCombatTurn({
    db: input.db,
    provider: input.provider,
    campaignId: input.campaignId,
    character: input.character,
    regionId: input.regionId,
    playerInput: input.playerInput,
    rng: input.rng,
    encounter,
    runCatchUp: (enc) =>
      resolveNonPlayerCatchUp({
        db: input.db,
        provider: input.provider,
        campaignId: input.campaignId,
        player: input.character,
        encounter: enc,
        rng: input.rng
      })
  })
  createSaveSnapshot(input.db, input.campaignId)
  return fleeResult
}

export function resolveEndBranch(
  db: Database.Database,
  encounter: CombatEncounter,
  characterId: string
): TurnResult {
  if (!isPlayerCombatTurn(encounter, characterId)) {
    throw new CombatTurnError('It is not your turn')
  }
  finalizeEncounter(db, encounter, 'retreated')
  const character = getCharacterById(db, characterId)
  return {
    narrationText: '',
    npcReactions: [],
    partyMemberActions: [],
    combatState: null,
    pendingAlignmentShift: character?.pendingAlignmentShift ?? null
  }
}

export async function resolveAttackBranch(
  input: CombatTurnInput,
  encounter: CombatEncounter
): Promise<{ encounter: CombatEncounter; lastAttack: CombatAttackResult; npcYieldOutcome?: NpcYieldOutcome; yieldNarrationHint?: string }> {
  const syncResult = resolvePlayerAttack({
    db: input.db,
    player: input.character,
    targetNpcId: input.intent.targetNpcId,
    rng: input.rng,
    lethality: input.intent.lethality,
    offerMercy: input.intent.offerMercy,
    acceptSurrender: input.intent.acceptSurrender
  })
  const yieldResult = await resolveYieldReview(input.db, input.provider, input.campaignId, syncResult)
  const updated = advanceEncounterTurn(
    input.db,
    reloadEncounter(input.db, input.campaignId),
    encounter.participantIds
  )
  appendCombatTurnAdvanced(input.db, updated)
  return { encounter: updated, lastAttack: syncResult.attackResult, ...yieldResult }
}
