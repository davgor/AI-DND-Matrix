import type Database from 'better-sqlite3'
import { getSpellByKey } from '../db/catalog/spells'
import { getCharacterById } from '../db/repositories/characters'
import { resolveKnownSpells } from '../engine/knownSpells'
import type { KnownSpellView } from '../shared/spells/types'

export function listKnownSpellsForCharacter(
  db: Database.Database,
  characterId: string
): KnownSpellView[] {
  const character = getCharacterById(db, characterId)
  if (!character) {
    return []
  }
  const keys = (character.stats as { knownSpellKeys?: string[] }).knownSpellKeys ?? []
  return resolveKnownSpells(keys, (key) => {
    const spell = getSpellByKey(db, key)
    if (!spell) {
      return undefined
    }
    return {
      key: spell.key,
      name: spell.name,
      effectType: spell.effectType,
      range: spell.range,
      cost: spell.cost,
      tags: spell.tags,
      constraints: spell.constraints
    }
  })
}
