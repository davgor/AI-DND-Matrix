import { describe, expect, it } from 'vitest'
import { buildLootSeedKey, selectLootDeterministic } from './lootSelector'
import type { CatalogItem } from '../shared/items/types'
import type { LootContext, LootPolicy } from '../shared/loot/types'

function makeItem(id: string, name: string): CatalogItem {
  return {
    id,
    name,
    itemType: 'misc',
    description: `${name} description`,
    rarity: 'common',
    mechanicalProperties: { kind: 'misc' },
    equipSlot: null,
    source: 'seed'
  }
}

const candidates = [
  makeItem('i1', 'Fang'),
  makeItem('i2', 'Hide'),
  makeItem('i3', 'Claw'),
  makeItem('i4', 'Bone'),
  makeItem('i5', 'Pelt')
]

function makePolicy(maxGrantCount: number): LootPolicy {
  return { allowedItemTypes: ['misc'], maxRarity: 'common', maxGrantCount, catalogRetrieveFirst: true }
}

describe('selectLootDeterministic', () => {
  it('is deterministic for the same seed key and inputs', () => {
    const input = { candidates, policy: makePolicy(3), seedKey: 'camp|enc|npc-1', recentItemIds: [] }
    const first = selectLootDeterministic(input)
    const second = selectLootDeterministic(input)
    expect(first.map((i) => i.id)).toEqual(second.map((i) => i.id))
  })

  it('grants at least one and at most maxGrantCount distinct items', () => {
    for (const seedKey of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const picks = selectLootDeterministic({
        candidates,
        policy: makePolicy(3),
        seedKey,
        recentItemIds: []
      })
      expect(picks.length).toBeGreaterThanOrEqual(1)
      expect(picks.length).toBeLessThanOrEqual(3)
      expect(new Set(picks.map((i) => i.id)).size).toBe(picks.length)
    }
  })

  it('returns nothing for a zero grant cap or empty candidates', () => {
    expect(
      selectLootDeterministic({ candidates, policy: makePolicy(0), seedKey: 'x', recentItemIds: [] })
    ).toEqual([])
    expect(
      selectLootDeterministic({ candidates: [], policy: makePolicy(2), seedKey: 'x', recentItemIds: [] })
    ).toEqual([])
  })
})

describe('selectLootDeterministic variety', () => {
  it('variety guard: deprioritizes recently granted items with the same seed', () => {
    const policy = makePolicy(2)
    const first = selectLootDeterministic({ candidates, policy, seedKey: 'repeat', recentItemIds: [] })
    const second = selectLootDeterministic({
      candidates,
      policy,
      seedKey: 'repeat',
      recentItemIds: first.map((i) => i.id)
    })
    const firstIds = new Set(first.map((i) => i.id))
    for (const pick of second) {
      expect(firstIds.has(pick.id)).toBe(false)
    }
  })

  it('variety guard: still grants recent items when nothing fresh remains', () => {
    const pair = [makeItem('only-1', 'Fang'), makeItem('only-2', 'Hide')]
    const picks = selectLootDeterministic({
      candidates: pair,
      policy: makePolicy(2),
      seedKey: 'exhausted',
      recentItemIds: ['only-1', 'only-2']
    })
    expect(picks.length).toBeGreaterThanOrEqual(1)
  })

  it('varies picks across different seed keys', () => {
    const seen = new Set<string>()
    for (const seedKey of ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']) {
      const picks = selectLootDeterministic({ candidates, policy: makePolicy(3), seedKey, recentItemIds: [] })
      seen.add(picks.map((i) => i.id).join(','))
    }
    expect(seen.size).toBeGreaterThan(1)
  })
})

describe('buildLootSeedKey', () => {
  const baseContext: LootContext = {
    source: 'encounter_end',
    foes: [
      { npcId: 'n1', npcRole: 'wolf', combatTier: 'catalog', buckets: ['beast'], outcome: 'slain' }
    ],
    regionId: 'r1',
    playerLevel: 2,
    playerCharacterId: 'c1',
    campaignId: 'camp1'
  }

  it('differs across encounters with different foes', () => {
    const other: LootContext = {
      ...baseContext,
      foes: [
        { npcId: 'n2', npcRole: 'wolf', combatTier: 'catalog', buckets: ['beast'], outcome: 'slain' }
      ]
    }
    expect(buildLootSeedKey(baseContext)).not.toBe(buildLootSeedKey(other))
  })

  it('uses quest id for quest completions', () => {
    const quest: LootContext = {
      ...baseContext,
      source: 'quest_complete',
      foes: [],
      questId: 'q1'
    }
    const otherQuest: LootContext = { ...quest, questId: 'q2' }
    expect(buildLootSeedKey(quest)).toContain('q1')
    expect(buildLootSeedKey(quest)).not.toBe(buildLootSeedKey(otherQuest))
  })
})
