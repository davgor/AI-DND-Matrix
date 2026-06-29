import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { getCreatureByKey, listAllCreatures } from './creatures'
import { importCreatureSeeds } from './importPipeline'
import { CREATURE_SEEDS_V1 } from './seeds/creatures'
import { seedCreatureAndSpellCatalogV1 } from './seeds'

describe('curation/update workflow for the preseed catalog', () => {
  it('applying a curated update to one entry leaves the rest of the dataset untouched', () => {
    const db = createTestDb()
    const before = listAllCreatures(db)

    const curatedUpdate = CREATURE_SEEDS_V1.find((seed) => seed.key === 'goblin-scout')
    if (!curatedUpdate) throw new Error('fixture missing expected seed')

    importCreatureSeeds(db, [{ ...curatedUpdate, hp: curatedUpdate.hp + 1, version: curatedUpdate.version + 1 }])

    const after = listAllCreatures(db)
    expect(after).toHaveLength(before.length)

    const updated = getCreatureByKey(db, 'goblin-scout')
    expect(updated?.hp).toBe(curatedUpdate.hp + 1)
    expect(updated?.version).toBe(curatedUpdate.version + 1)
  })

  it('reseeding the catalog from scratch is reproducible (same dataset, same outcome)', () => {
    const dbA = createTestDb()
    const dbB = createTestDb()
    seedCreatureAndSpellCatalogV1(dbA)
    seedCreatureAndSpellCatalogV1(dbB)

    const keysA = listAllCreatures(dbA).map((c) => c.key)
    const keysB = listAllCreatures(dbB).map((c) => c.key)
    expect(keysA).toEqual(keysB)
  })

  it('re-running the full seed catalog import does not destroy or duplicate existing rows', () => {
    const db = createTestDb()
    const before = listAllCreatures(db)

    seedCreatureAndSpellCatalogV1(db)

    expect(listAllCreatures(db)).toHaveLength(before.length)
  })
})
