import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { getCreatureByKey, listCreaturesByBucket, upsertCreature } from './creatures'
import type { CreateCatalogCreatureInput } from './types'

const TEST_GOBLIN: CreateCatalogCreatureInput = {
  key: 'test-goblin-scout',
  name: 'Test Goblin Scout',
  archetypeHint: 'rogue',
  levelMin: 1,
  levelMax: 3,
  hp: 7,
  ac: 14,
  abilities: { body: 8, agility: 14, mind: 10, presence: 8 },
  resistances: {},
  damageTypes: ['physical'],
  tags: ['raider', 'ranged'],
  buckets: ['goblinoid'],
  temperament: 'cunning',
  canSpeak: true,
  source: 'seed',
  version: 1
}

function rowCountByKey(db: ReturnType<typeof createTestDb>, key: string): number {
  const row = db
    .prepare('SELECT COUNT(*) as count FROM catalog_creatures WHERE key = ?')
    .get(key) as { count: number }
  return row.count
}

describe('catalog creatures repository', () => {
  it('inserts a new creature and reads it back by key with its bucket tags', () => {
    const db = createTestDb()
    const created = upsertCreature(db, TEST_GOBLIN)

    expect(created.key).toBe('test-goblin-scout')
    expect(created.id).toBeTruthy()

    const fetched = getCreatureByKey(db, 'test-goblin-scout')
    expect(fetched).toEqual(created)
    expect(fetched?.buckets).toEqual(['goblinoid'])
  })

  it('upserts idempotently by key without creating duplicate rows', () => {
    const db = createTestDb()
    const first = upsertCreature(db, TEST_GOBLIN)
    const second = upsertCreature(db, { ...TEST_GOBLIN, hp: 9 })

    expect(second.id).toBe(first.id)
    expect(second.hp).toBe(9)
    expect(rowCountByKey(db, 'test-goblin-scout')).toBe(1)
  })

  it('replaces bucket tags on re-import rather than accumulating them', () => {
    const db = createTestDb()
    const created = upsertCreature(db, TEST_GOBLIN)
    const updated = upsertCreature(db, { ...TEST_GOBLIN, buckets: ['goblinoid', 'humanoid'] })

    expect(updated.buckets.sort()).toEqual(['goblinoid', 'humanoid'])
    const tagCount = db
      .prepare('SELECT COUNT(*) as count FROM catalog_bucket_tags WHERE entity_id = ?')
      .get(created.id) as { count: number }
    expect(tagCount.count).toBe(2)
  })

  it('lists creatures filtered by bucket, including this new entry', () => {
    const db = createTestDb()
    upsertCreature(db, TEST_GOBLIN)

    const goblinoids = listCreaturesByBucket(db, 'goblinoid')
    expect(goblinoids.map((creature) => creature.key)).toContain('test-goblin-scout')
  })

  it('returns undefined for an unknown key', () => {
    const db = createTestDb()
    expect(getCreatureByKey(db, 'nonexistent')).toBeUndefined()
  })
})
