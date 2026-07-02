import { describe, expect, it } from 'vitest'
import { appendKnownSpellKeys, resolveKnownSpells, type CatalogSpellLookupRow } from './knownSpells'

const FIXTURES: Record<string, CatalogSpellLookupRow> = {
  firebolt: {
    key: 'firebolt',
    name: 'Firebolt',
    effectType: 'damage',
    range: 'ranged',
    cost: 1,
    tags: ['fire'],
    constraints: { requiresArchetype: ['mage'], minLevel: 1 }
  },
  'frost-shard': {
    key: 'frost-shard',
    name: 'Frost Shard',
    effectType: 'damage',
    range: 'ranged',
    cost: 2,
    tags: ['cold'],
    constraints: { requiresArchetype: ['mage'], minLevel: 3 }
  }
}

describe('resolveKnownSpells', () => {
  it('resolves valid keys sorted alphabetically by name', () => {
    const spells = resolveKnownSpells(['frost-shard', 'firebolt'], (key) => FIXTURES[key])
    expect(spells.map((spell) => spell.name)).toEqual(['Firebolt', 'Frost Shard'])
    expect(spells[0]?.catalogKey).toBe('firebolt')
    expect(spells[0]?.constraintsHint).toBe('Mage · level 1+')
    expect(spells[0]?.rulesText).toContain('1 turn')
  })

  it('drops unknown keys', () => {
    const spells = resolveKnownSpells(['firebolt', 'missing-spell'], (key) => FIXTURES[key])
    expect(spells).toHaveLength(1)
    expect(spells[0]?.catalogKey).toBe('firebolt')
  })

  it('returns empty list for empty input', () => {
    expect(resolveKnownSpells([], () => undefined)).toEqual([])
  })

  it('dedupes duplicate keys', () => {
    const spells = resolveKnownSpells(['firebolt', 'firebolt'], (key) => FIXTURES[key])
    expect(spells).toHaveLength(1)
  })
})

describe('appendKnownSpellKeys', () => {
  it('appends validated keys without duplicates', () => {
    const next = appendKnownSpellKeys(
      ['firebolt'],
      ['frost-shard', 'firebolt', 'bogus'],
      (key) => key in FIXTURES
    )
    expect(next).toEqual(['firebolt', 'frost-shard'])
  })
})
