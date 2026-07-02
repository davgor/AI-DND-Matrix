import type Database from 'better-sqlite3'
import { getSpellByKey } from '../db/catalog/spells'
import { getCharacterById, updateCharacter } from '../db/repositories/characters'
import { appendKnownSpellKeys, resolveKnownSpells } from '../engine/knownSpells'
import { windowKnownSpellsForNarration, type KnownSpellContext } from './spellWindow'

export function loadKnownSpellsForNarration(
  db: Database.Database,
  characterId: string
): KnownSpellContext[] {
  const character = getCharacterById(db, characterId)
  if (!character) {
    return []
  }
  const keys = (character.stats as { knownSpellKeys?: string[] }).knownSpellKeys ?? []
  const resolved = resolveKnownSpells(keys, (key) => {
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
  return windowKnownSpellsForNarration(resolved)
}

export function persistSpellGrants(
  db: Database.Database,
  characterId: string,
  grants: Array<{ catalogSpellKey: string }> | undefined
): void {
  if (!grants?.length) {
    return
  }
  const character = getCharacterById(db, characterId)
  if (!character) {
    return
  }
  const current = (character.stats as { knownSpellKeys?: string[] }).knownSpellKeys ?? []
  const next = appendKnownSpellKeys(
    current,
    grants.map((grant) => grant.catalogSpellKey),
    (key) => Boolean(getSpellByKey(db, key))
  )
  updateCharacter(db, characterId, { stats: { ...character.stats, knownSpellKeys: next } })
}
