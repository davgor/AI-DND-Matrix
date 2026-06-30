import type Database from 'better-sqlite3'
import type { RandomFn } from '../engine/abilities'
import type { Provider } from '../agents/providers/types'
import type { Character } from '../db/repositories/characters'
import { appendEvent } from '../db/repositories/events'
import {
  getActiveEncounter,
  hasCombatantExited,
  type CombatEncounter
} from '../db/repositories/combatEncounters'
import type { TurnResult } from './turnIpc'
import { CombatTurnError } from './combatErrors'
import {
  resolveFailedFleeTurn,
  resolveSuccessfulFleeTurn,
  rollFleeDisengageCheck,
  selectThreateningHostile
} from './combatFleeHelpers'

export interface FleeCombatTurnInput {
  db: Database.Database
  provider: Provider
  campaignId: string
  character: Character
  regionId: string
  playerInput: string
  rng: RandomFn
  encounter: CombatEncounter
  runCatchUp: (
    encounter: CombatEncounter
  ) => Promise<Pick<TurnResult, 'npcReactions' | 'partyMemberActions'>>
}

export async function resolveFleeInCombatTurn(input: FleeCombatTurnInput): Promise<TurnResult> {
  const { db, provider, campaignId, character, regionId, playerInput, rng, runCatchUp } = input
  const encounter = input.encounter
  const hostile = selectThreateningHostile(db, encounter)
  if (!hostile) {
    throw new CombatTurnError('No engaged hostile to flee from')
  }

  const check = rollFleeDisengageCheck(character, hostile, rng)
  appendEvent(db, {
    campaignId,
    type: 'flee_attempt',
    payload: {
      characterId: character.id,
      playerInput,
      threateningNpcId: hostile.npcId,
      check,
      success: check.success
    }
  })

  if (!check.success) {
    const failed = await resolveFailedFleeTurn({
      db,
      campaignId,
      characterId: character.id,
      encounter,
      hostile,
      check,
      runCatchUp
    })
    return failed.result
  }

  return resolveSuccessfulFleeTurn({
    db,
    provider,
    campaignId,
    characterId: character.id,
    regionId,
    encounter,
    check,
    playerRef: { kind: 'player', id: character.id },
    runCatchUp
  })
}

export function playerHasExitedEncounter(db: Database.Database, campaignId: string, playerId: string): boolean {
  const encounter = getActiveEncounter(db, campaignId)
  if (!encounter) {
    return false
  }
  return hasCombatantExited(encounter, { kind: 'player', id: playerId })
}
