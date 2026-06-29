import type Database from 'better-sqlite3'

export interface OrphanedBucketTag {
  entityType: string
  entityId: string
}

export interface DuplicateKey {
  table: 'catalog_creatures' | 'catalog_spells'
  key: string
  count: number
}

export interface CatalogIntegrityReport {
  orphanedBucketTags: OrphanedBucketTag[]
  duplicateKeys: DuplicateKey[]
  healthy: boolean
}

function findOrphanedBucketTags(db: Database.Database): OrphanedBucketTag[] {
  const orphanedCreatureTags = db
    .prepare(
      `SELECT entity_type, entity_id FROM catalog_bucket_tags
       WHERE entity_type = 'creature'
         AND entity_id NOT IN (SELECT id FROM catalog_creatures)`
    )
    .all() as { entity_type: string; entity_id: string }[]
  const orphanedSpellTags = db
    .prepare(
      `SELECT entity_type, entity_id FROM catalog_bucket_tags
       WHERE entity_type = 'spell'
         AND entity_id NOT IN (SELECT id FROM catalog_spells)`
    )
    .all() as { entity_type: string; entity_id: string }[]

  return [...orphanedCreatureTags, ...orphanedSpellTags].map((row) => ({
    entityType: row.entity_type,
    entityId: row.entity_id
  }))
}

function findDuplicateKeys(
  db: Database.Database,
  table: 'catalog_creatures' | 'catalog_spells'
): DuplicateKey[] {
  const rows = db
    .prepare(`SELECT key, COUNT(*) as count FROM ${table} GROUP BY key HAVING COUNT(*) > 1`)
    .all() as { key: string; count: number }[]
  return rows.map((row) => ({ table, key: row.key, count: row.count }))
}

export function checkCatalogIntegrity(db: Database.Database): CatalogIntegrityReport {
  const orphanedBucketTags = findOrphanedBucketTags(db)
  const duplicateKeys = [
    ...findDuplicateKeys(db, 'catalog_creatures'),
    ...findDuplicateKeys(db, 'catalog_spells')
  ]
  return {
    orphanedBucketTags,
    duplicateKeys,
    healthy: orphanedBucketTags.length === 0 && duplicateKeys.length === 0
  }
}
