import type Database from 'better-sqlite3'
import { listAllCreatures } from '../../db/catalog/creatures'
import { checkCatalogIntegrity, type CatalogIntegrityReport } from '../../db/catalog/integrity'
import { listAllSpells } from '../../db/catalog/spells'
import { BUCKETS, type Bucket } from '../../shared/catalogTaxonomy'
import { getCatalogRetrievalStats, type CatalogRetrievalStats } from './decisionPolicy'

export interface CatalogQualityReport {
  totalCreatures: number
  totalSpells: number
  bucketCoverage: Record<Bucket, number>
  integrity: CatalogIntegrityReport
  retrieval: CatalogRetrievalStats
}

function countByBucket(db: Database.Database): Record<Bucket, number> {
  const creatures = listAllCreatures(db)
  const coverage = {} as Record<Bucket, number>
  for (const bucket of BUCKETS) {
    coverage[bucket] = creatures.filter((creature) => creature.buckets.includes(bucket)).length
  }
  return coverage
}

export function buildCatalogQualityReport(
  db: Database.Database,
  campaignId: string
): CatalogQualityReport {
  return {
    totalCreatures: listAllCreatures(db).length,
    totalSpells: listAllSpells(db).length,
    bucketCoverage: countByBucket(db),
    integrity: checkCatalogIntegrity(db),
    retrieval: getCatalogRetrievalStats(db, campaignId)
  }
}
