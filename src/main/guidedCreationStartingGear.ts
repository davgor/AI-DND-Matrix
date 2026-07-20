import type Database from 'better-sqlite3'
import { getSpellByKey } from '../db/catalog/spells'
import { listCharacterItems } from '../db/repositories/characterItems'

interface StartingGearEntry {
  name: string
  equippedSlot: string | null
}

export function resolveCharacterStartingGear(
  db: Database.Database,
  characterId: string,
  stats: Record<string, unknown>
): { startingGear: StartingGearEntry[]; knownSpellNames: string[] } {
  const startingGear = listCharacterItems(db, characterId).map((row) => ({
    name: row.item.name,
    equippedSlot: row.equippedSlot
  }))
  const keys = (stats.knownSpellKeys as string[] | undefined) ?? []
  const knownSpellNames = keys
    .map((key) => getSpellByKey(db, key)?.name)
    .filter((name): name is string => Boolean(name))
  return { startingGear, knownSpellNames }
}
