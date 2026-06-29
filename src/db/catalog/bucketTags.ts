import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { Bucket } from '../../shared/catalogTaxonomy'

export type CatalogEntityType = 'creature' | 'spell'

interface BucketTagRow {
  bucket: string
}

export function replaceBucketTags(
  db: Database.Database,
  entityType: CatalogEntityType,
  entityId: string,
  buckets: Bucket[]
): void {
  db.prepare('DELETE FROM catalog_bucket_tags WHERE entity_type = ? AND entity_id = ?').run(
    entityType,
    entityId
  )
  const insert = db.prepare(
    'INSERT INTO catalog_bucket_tags (id, entity_type, entity_id, bucket) VALUES (?, ?, ?, ?)'
  )
  for (const bucket of buckets) {
    insert.run(randomUUID(), entityType, entityId, bucket)
  }
}

export function getBucketTags(
  db: Database.Database,
  entityType: CatalogEntityType,
  entityId: string
): Bucket[] {
  const rows = db
    .prepare('SELECT bucket FROM catalog_bucket_tags WHERE entity_type = ? AND entity_id = ?')
    .all(entityType, entityId) as BucketTagRow[]
  return rows.map((row) => row.bucket as Bucket)
}

export function listEntityIdsByBucket(
  db: Database.Database,
  entityType: CatalogEntityType,
  bucket: Bucket
): string[] {
  const rows = db
    .prepare('SELECT entity_id FROM catalog_bucket_tags WHERE entity_type = ? AND bucket = ?')
    .all(entityType, bucket) as { entity_id: string }[]
  return rows.map((row) => row.entity_id)
}
