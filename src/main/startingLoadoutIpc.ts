import { ipcMain } from 'electron'
import type { Archetype } from '../engine/hp'
import { inferArchetypeFromClassOrRole } from '../engine/archetypeInference'
import type { StartingLoadoutInput } from '../engine/startingLoadout/validate'
import type {
  AppliedStartingLoadoutSnapshot,
  ApplyStartingLoadoutResult,
  StartingLoadoutOffer
} from '../shared/startingLoadout/types'
import { getCharacterById } from '../db/repositories/characters'
import {
  applyStartingLoadout,
  buildStartingLoadoutOfferWithDiagnostics,
  readAppliedStartingLoadoutSnapshot
} from '../db/repositories/startingLoadout'
import { getDb } from './db'

export interface GetStartingLoadoutOfferInput {
  characterId: string
}

export type GetStartingLoadoutOfferResult =
  | {
      ok: true
      offer: StartingLoadoutOffer
      previousSelections?: AppliedStartingLoadoutSnapshot
    }
  | {
      ok: false
      reason: 'not_found' | 'offer_unavailable'
      missingItems?: string[]
      missingSpells?: string[]
    }

export function getStartingLoadoutOffer(
  db: ReturnType<typeof getDb>,
  input: GetStartingLoadoutOfferInput
): GetStartingLoadoutOfferResult {
  const character = getCharacterById(db, input.characterId)
  if (!character) {
    return { ok: false, reason: 'not_found' }
  }
  const archetype = inferArchetypeFromClassOrRole(character.characterClass) as Archetype
  const built = buildStartingLoadoutOfferWithDiagnostics(db, archetype)
  if (!built.offer) {
    return {
      ok: false,
      reason: 'offer_unavailable',
      missingItems: built.missingItems,
      missingSpells: built.missingSpells
    }
  }
  const previousSelections = readAppliedStartingLoadoutSnapshot(db, character.id)
  return previousSelections
    ? { ok: true, offer: built.offer, previousSelections }
    : { ok: true, offer: built.offer }
}

export interface ApplyStartingLoadoutInput {
  characterId: string
  selections: StartingLoadoutInput
}

export function registerStartingLoadoutHandlers(): void {
  ipcMain.handle(
    'startingLoadout:getOffer',
    (_event, input: GetStartingLoadoutOfferInput): GetStartingLoadoutOfferResult =>
      getStartingLoadoutOffer(getDb(), input)
  )
  ipcMain.handle(
    'startingLoadout:apply',
    (_event, input: ApplyStartingLoadoutInput): ApplyStartingLoadoutResult =>
      applyStartingLoadout(getDb(), input.characterId, input.selections)
  )
}
