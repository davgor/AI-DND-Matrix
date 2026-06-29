import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { getSpellByKey, listSpellsByBucket, upsertSpell } from './spells'
import type { CreateCatalogSpellInput } from './types'

const TEST_FIREBOLT: CreateCatalogSpellInput = {
  key: 'test-firebolt',
  name: 'Test Firebolt',
  effectType: 'damage',
  range: 'ranged',
  cost: 1,
  archetypeHint: 'mage',
  tags: ['fire', 'single-target'],
  buckets: ['elemental'],
  constraints: { requiresArchetype: ['mage'] },
  source: 'seed',
  version: 1
}

function rowCountByKey(db: ReturnType<typeof createTestDb>, key: string): number {
  const row = db.prepare('SELECT COUNT(*) as count FROM catalog_spells WHERE key = ?').get(key) as {
    count: number
  }
  return row.count
}

describe('catalog spells repository', () => {
  it('inserts a new spell and reads it back by key with constraints and buckets', () => {
    const db = createTestDb()
    const created = upsertSpell(db, TEST_FIREBOLT)

    const fetched = getSpellByKey(db, 'test-firebolt')
    expect(fetched).toEqual(created)
    expect(fetched?.constraints).toEqual({ requiresArchetype: ['mage'] })
    expect(fetched?.buckets).toEqual(['elemental'])
  })

  it('upserts idempotently by key without creating duplicate rows', () => {
    const db = createTestDb()
    const first = upsertSpell(db, TEST_FIREBOLT)
    const second = upsertSpell(db, { ...TEST_FIREBOLT, cost: 2 })

    expect(second.id).toBe(first.id)
    expect(second.cost).toBe(2)
    expect(rowCountByKey(db, 'test-firebolt')).toBe(1)
  })

  it('lists spells filtered by bucket, including this new entry', () => {
    const db = createTestDb()
    upsertSpell(db, TEST_FIREBOLT)

    const elemental = listSpellsByBucket(db, 'elemental')
    expect(elemental.map((spell) => spell.key)).toContain('test-firebolt')
  })

  it('returns undefined for an unknown key', () => {
    const db = createTestDb()
    expect(getSpellByKey(db, 'nonexistent')).toBeUndefined()
  })
})
