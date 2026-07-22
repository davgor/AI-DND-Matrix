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

export interface SpellGrantPersistResult {
  newlyGrantedKeys: string[]
  newlyGrantedNames: string[]
}

export function formatSpellGrantNarration(names: string[]): string | undefined {
  if (names.length === 0) {
    return undefined
  }
  if (names.length === 1) {
    return `You learned ${names[0]}.`
  }
  if (names.length === 2) {
    return `You learned ${names[0]} and ${names[1]}.`
  }
  const last = names[names.length - 1]
  return `You learned ${names.slice(0, -1).join(', ')}, and ${last}.`
}

export function persistSpellGrants(
  db: Database.Database,
  characterId: string,
  grants: Array<{ catalogSpellKey: string }> | undefined
): SpellGrantPersistResult {
  const empty: SpellGrantPersistResult = { newlyGrantedKeys: [], newlyGrantedNames: [] }
  if (!grants?.length) {
    return empty
  }
  const character = getCharacterById(db, characterId)
  if (!character) {
    return empty
  }
  const current = (character.stats as { knownSpellKeys?: string[] }).knownSpellKeys ?? []
  const proposed = grants.map((grant) => grant.catalogSpellKey)
  const next = appendKnownSpellKeys(current, proposed, (key) => Boolean(getSpellByKey(db, key)))
  const newlyGrantedKeys = next.filter((key) => !current.includes(key))
  if (newlyGrantedKeys.length === 0 && next.length === current.length) {
    return empty
  }
  updateCharacter(db, characterId, { stats: { ...character.stats, knownSpellKeys: next } })
  const newlyGrantedNames = newlyGrantedKeys.map((key) => getSpellByKey(db, key)?.name ?? key)
  return { newlyGrantedKeys, newlyGrantedNames }
}
