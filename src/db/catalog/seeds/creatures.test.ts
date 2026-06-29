import { describe, expect, it } from 'vitest'
import { BUCKETS } from '../../../shared/catalogTaxonomy'
import { listAllCreatures, listCreaturesByBucket } from '../creatures'
import { importCreatureSeeds } from '../importPipeline'
import { createTestDb } from '../../testUtils'
import { CREATURE_SEEDS_V1 } from './creatures'

describe('creature preseed dataset v1', () => {
  it('covers every taxonomy bucket with at least one entry', () => {
    for (const bucket of BUCKETS) {
      const inBucket = CREATURE_SEEDS_V1.filter((seed) => seed.buckets.includes(bucket))
      expect(inBucket.length).toBeGreaterThan(0)
    }
  })

  it('has unique keys across the dataset', () => {
    const keys = CREATURE_SEEDS_V1.map((seed) => seed.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('imports without validation errors and yields stable, queryable records', () => {
    const db = createTestDb()
    const result = importCreatureSeeds(db, CREATURE_SEEDS_V1)

    expect(result.errors).toEqual([])
    expect(result.imported).toHaveLength(CREATURE_SEEDS_V1.length)
    expect(listAllCreatures(db)).toHaveLength(CREATURE_SEEDS_V1.length)
    expect(listCreaturesByBucket(db, 'undead').map((c) => c.key).sort()).toEqual(
      ['skeleton-archer', 'zombie-shambler'].sort()
    )
  })

  it('re-importing the dataset does not duplicate rows', () => {
    const db = createTestDb()
    importCreatureSeeds(db, CREATURE_SEEDS_V1)
    importCreatureSeeds(db, CREATURE_SEEDS_V1)

    expect(listAllCreatures(db)).toHaveLength(CREATURE_SEEDS_V1.length)
  })
})
