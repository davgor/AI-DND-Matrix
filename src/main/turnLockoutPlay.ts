import type Database from 'better-sqlite3'
import { getSpellByKey } from '../db/catalog/spells'
import { getCharacterById, updateCharacter, type Character } from '../db/repositories/characters'
import {
  applyTurnLockout,
  isActionLocked,
  resolveLockoutCostFromCatalog,
  tickTurnLockout,
  type LockoutStats
} from '../engine/turnLockout'
import type { IntentInterpretation } from '../agents/dm'

export const LOCKOUT_BLOCKED_MESSAGE =
  'You are still recovering from your last ability — you cannot take an Action this turn (movement is still allowed).'

export function readLockoutStats(character: Character): LockoutStats {
  return character.stats as LockoutStats
}

export function persistLockoutStats(db: Database.Database, characterId: string, stats: LockoutStats): void {
  const character = getCharacterById(db, characterId)
  if (!character) {
    return
  }
  updateCharacter(db, characterId, {
    stats: { ...character.stats, actionLockoutTurnsRemaining: stats.actionLockoutTurnsRemaining ?? 0 }
  })
}

export function intentConsumesAction(intent: IntentInterpretation): boolean {
  if (intent.actionType !== undefined) {
    return true
  }
  if ((intent.combatIntent ?? 'none') !== 'none') {
    return true
  }
  if (intent.checkNeeded) {
    return true
  }
  if (intent.usedCatalogSpellKey) {
    return true
  }
  return false
}

export function tryBlockLockedAction(
  db: Database.Database,
  character: Character,
  intent: IntentInterpretation
): { blocked: true; message: string } | { blocked: false } {
  if (!isActionLocked(readLockoutStats(character)) || !intentConsumesAction(intent)) {
    return { blocked: false }
  }
  const next = tickTurnLockout(readLockoutStats(character))
  persistLockoutStats(db, character.id, next)
  return { blocked: true, message: LOCKOUT_BLOCKED_MESSAGE }
}

export function applyCatalogSpellLockout(
  db: Database.Database,
  character: Character,
  usedCatalogSpellKey: string | undefined
): number | null {
  if (!usedCatalogSpellKey) {
    return null
  }
  const known = (character.stats as { knownSpellKeys?: string[] }).knownSpellKeys ?? []
  if (!known.includes(usedCatalogSpellKey)) {
    return null
  }
  const spell = getSpellByKey(db, usedCatalogSpellKey)
  if (!spell) {
    return null
  }
  const cost = resolveLockoutCostFromCatalog(spell.cost)
  if (cost <= 0) {
    return null
  }
  const next = applyTurnLockout(readLockoutStats(character), cost)
  persistLockoutStats(db, character.id, next)
  return cost
}
