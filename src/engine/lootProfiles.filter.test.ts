import { describe, it, expect } from 'vitest'
import { listLootExemplarsForPolicy, LOOT_EXEMPLAR_TABLE } from './lootProfiles'
import type { LootPolicy } from '../shared/loot/types'

function makePolicy(overrides: Partial<LootPolicy>): LootPolicy {
  return {
    allowedItemTypes: ['weapon', 'armor', 'potion', 'magicItem', 'misc'],
    maxRarity: 'epic',
    maxGrantCount: 3,
    catalogRetrieveFirst: true,
    ...overrides
  }
}

describe('listLootExemplarsForPolicy filtering', () => {
  it('returns deterministic misc-only results', () => {
    const policy = makePolicy({ allowedItemTypes: ['misc'], maxRarity: 'common' })
    const first = listLootExemplarsForPolicy(policy)
    expect(first).toEqual(listLootExemplarsForPolicy(policy))
    for (const exemplar of first) {
      expect(exemplar.itemType).toBe('misc')
      expect(exemplar.rarity).toBe('common')
    }
  })

  it('allows uncommon rarities when policy permits', () => {
    const results = listLootExemplarsForPolicy(makePolicy({ maxRarity: 'uncommon' }))
    for (const exemplar of results) {
      expect(['common', 'uncommon']).toContain(exemplar.rarity)
    }
  })

  it('returns only common weapons when restricted', () => {
    const policy = makePolicy({ allowedItemTypes: ['weapon'], maxRarity: 'common' })
    const expected = Object.values(LOOT_EXEMPLAR_TABLE)
      .flat()
      .filter((e) => e.itemType === 'weapon' && e.rarity === 'common')
      .sort((a, b) => a.name.localeCompare(b.name) || a.itemType.localeCompare(b.itemType))
    expect(listLootExemplarsForPolicy(policy)).toEqual(expected)
  })
})

describe('listLootExemplarsForPolicy ordering', () => {
  it('sorts stably by name then itemType', () => {
    const results = listLootExemplarsForPolicy(makePolicy({}))
    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1]
      const curr = results[i]
      const cmp = prev.name.localeCompare(curr.name) || prev.itemType.localeCompare(curr.itemType)
      expect(cmp).toBeLessThanOrEqual(0)
    }
  })
})
