import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { checkCatalogIntegrity } from './integrity'

describe('catalog integrity checks', () => {
  it('reports no issues for a freshly seeded catalog', () => {
    const db = createTestDb()
    const report = checkCatalogIntegrity(db)

    expect(report.orphanedBucketTags).toEqual([])
    expect(report.duplicateKeys).toEqual([])
    expect(report.healthy).toBe(true)
  })

  it('detects an orphaned bucket tag pointing at a deleted creature', () => {
    const db = createTestDb()
    const orphanId = randomUUID()
    db.prepare(
      'INSERT INTO catalog_bucket_tags (id, entity_type, entity_id, bucket) VALUES (?, ?, ?, ?)'
    ).run(randomUUID(), 'creature', orphanId, 'undead')

    const report = checkCatalogIntegrity(db)
    expect(report.orphanedBucketTags).toContainEqual({ entityType: 'creature', entityId: orphanId })
    expect(report.healthy).toBe(false)
  })

  it('relies on the UNIQUE(key) constraint to reject duplicate canonical keys at insert time', () => {
    const db = createTestDb()
    const existingKey = (db.prepare('SELECT key FROM catalog_creatures LIMIT 1').get() as {
      key: string
    }).key

    expect(() =>
      db
        .prepare(
          `INSERT INTO catalog_creatures (id, key, name, level_min, level_max, hp, ac, created_at)
           VALUES (?, ?, 'Duplicate', 1, 1, 1, 1, datetime('now'))`
        )
        .run(randomUUID(), existingKey)
    ).toThrow()
  })

  it('finds no duplicate keys when the catalog only contains rows written through the upsert path', () => {
    const db = createTestDb()
    expect(checkCatalogIntegrity(db).duplicateKeys).toEqual([])
  })
})
