import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { retrieveCreatures, retrieveSpells } from './retrieval'

describe('catalog retrieval: creatures', () => {
  it('filters by bucket', () => {
    const db = createTestDb()
    const results = retrieveCreatures(db, { buckets: ['undead'] })

    expect(results.length).toBeGreaterThan(0)
    for (const result of results) {
      expect(result.entry.buckets).toContain('undead')
    }
  })

  it('ranks creatures whose level range fits the requested level above out-of-range ones', () => {
    const db = createTestDb()
    const results = retrieveCreatures(db, { buckets: ['goblinoid'], level: 2 })

    const inRange = results.filter((r) => r.entry.levelMin <= 2 && r.entry.levelMax >= 2)
    const outOfRange = results.filter((r) => !(r.entry.levelMin <= 2 && r.entry.levelMax >= 2))
    if (inRange.length > 0 && outOfRange.length > 0) {
      expect(results[0].entry.levelMin).toBeLessThanOrEqual(2)
      expect(inRange[0].score).toBeGreaterThanOrEqual(outOfRange[0].score)
    }
  })

  it('returns deterministic results for identical inputs', () => {
    const db = createTestDb()
    const first = retrieveCreatures(db, { buckets: ['beast'], level: 3 })
    const second = retrieveCreatures(db, { buckets: ['beast'], level: 3 })

    expect(first.map((r) => r.entry.key)).toEqual(second.map((r) => r.entry.key))
  })

  it('returns an empty array when no entries match the requested bucket', () => {
    const db = createTestDb()
    db.exec('DELETE FROM catalog_bucket_tags')

    const results = retrieveCreatures(db, { buckets: ['undead'] })
    expect(results).toEqual([])
  })

  it('applies a diversity constraint so a single bucket does not dominate broad queries', () => {
    const db = createTestDb()
    const results = retrieveCreatures(db, {
      buckets: ['goblinoid', 'undead', 'beast', 'construct'],
      limit: 4
    })

    const buckets = results.map((r) => r.entry.buckets[0])
    expect(new Set(buckets).size).toBeGreaterThan(1)
  })

  it('respects the limit', () => {
    const db = createTestDb()
    const results = retrieveCreatures(db, { buckets: ['beast'], limit: 1 })
    expect(results.length).toBeLessThanOrEqual(1)
  })
})

describe('catalog retrieval: spells', () => {
  it('filters by archetype hint', () => {
    const db = createTestDb()
    const results = retrieveSpells(db, { archetypeHint: 'cleric' })

    expect(results.length).toBeGreaterThan(0)
    for (const result of results) {
      expect(result.entry.archetypeHint).toBe('cleric')
    }
  })

  it('returns an empty array with no match', () => {
    const db = createTestDb()
    db.exec("DELETE FROM catalog_spells WHERE archetype_hint = 'mage'")

    const results = retrieveSpells(db, { archetypeHint: 'mage' })
    expect(results).toEqual([])
  })
})
