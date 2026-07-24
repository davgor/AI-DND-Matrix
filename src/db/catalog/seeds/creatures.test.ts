import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { BUCKETS } from '../../../shared/catalogTaxonomy'
import { runMigrations } from '../../migrations'
import { migrations } from '../../schema'
import { listAllCreatures, listCreaturesByBucket } from '../creatures'
import { importCreatureSeeds } from '../importPipeline'
import { createTestDb } from '../../testUtils'
import { CREATURE_SEEDS_V1 } from './creatures'

const ORIGINAL_CREATURE_SEED_KEYS = [
  'goblin-scout',
  'hobgoblin-soldier',
  'bandit-thug',
  'cultist-acolyte',
  'kobold-skirmisher',
  'wyrmling-drake',
  'zombie-shambler',
  'skeleton-archer',
  'imp-familiar',
  'lesser-demon-brute',
  'dire-wolf',
  'giant-spider',
  'fire-elemental-spark',
  'water-elemental-wisp',
  'stone-golem',
  'animated-armor'
] as const

describe('creature preseed dataset v1', () => {
  it('triples the original 16-entry roster to 48 conventional foes', () => {
    expect(CREATURE_SEEDS_V1).toHaveLength(48)
  })

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
      CREATURE_SEEDS_V1.filter((seed) => seed.buckets.includes('undead'))
        .map((seed) => seed.key)
        .sort()
    )
  })

  it('re-importing the dataset does not duplicate rows', () => {
    const db = createTestDb()
    importCreatureSeeds(db, CREATURE_SEEDS_V1)
    importCreatureSeeds(db, CREATURE_SEEDS_V1)

    expect(listAllCreatures(db)).toHaveLength(CREATURE_SEEDS_V1.length)
  })
})

describe('creature seed catalog migration 56', () => {
  it('expands a pre-triple 16-entry catalog to the full 48-entry roster', () => {
    const db = new Database(':memory:')
    runMigrations(
      db,
      migrations.filter((migration) => migration.version <= 55)
    )

    const placeholders = ORIGINAL_CREATURE_SEED_KEYS.map(() => '?').join(', ')
    db.prepare(
      `DELETE FROM catalog_bucket_tags
       WHERE entity_type = 'creature'
         AND entity_id IN (
           SELECT id FROM catalog_creatures WHERE key NOT IN (${placeholders})
         )`
    ).run(...ORIGINAL_CREATURE_SEED_KEYS)
    db.prepare(`DELETE FROM catalog_creatures WHERE key NOT IN (${placeholders})`).run(
      ...ORIGINAL_CREATURE_SEED_KEYS
    )
    expect(listAllCreatures(db)).toHaveLength(16)

    runMigrations(
      db,
      migrations.filter((migration) => migration.version >= 56)
    )
    expect(listAllCreatures(db)).toHaveLength(48)
  })
})
