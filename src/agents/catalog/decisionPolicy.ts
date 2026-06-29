import type Database from 'better-sqlite3'
import { appendEvent, listEventsByCampaign } from '../../db/repositories/events'
import { retrieveCreatures } from '../../db/catalog/retrieval'
import type { CatalogCreature } from '../../db/catalog/types'
import type { Bucket } from '../../shared/catalogTaxonomy'

export const RETRIEVAL_CONFIDENCE_THRESHOLD = 3

export const CATALOG_RETRIEVE_HIT_EVENT = 'catalog_retrieve_hit'
export const CATALOG_CREATE_FALLBACK_EVENT = 'catalog_create_fallback'

export interface CreatureRetrievalContext {
  buckets: Bucket[]
  level: number
  tags?: string[]
}

export interface RetrieveDecision {
  decision: 'retrieve'
  creature: CatalogCreature
  context: string
}

export interface CreateFallbackDecision {
  decision: 'create'
  reason: string
}

export type CreatureSourceDecision = RetrieveDecision | CreateFallbackDecision

export function formatCreatureContext(creature: CatalogCreature): string {
  const buckets = creature.buckets.join(', ')
  return `${creature.name} (level ${creature.levelMin}-${creature.levelMax}, HP ${creature.hp}, AC ${creature.ac}, buckets: ${buckets})`
}

function recordRetrieveHit(db: Database.Database, campaignId: string, creature: CatalogCreature): void {
  appendEvent(db, {
    campaignId,
    type: CATALOG_RETRIEVE_HIT_EVENT,
    payload: { entityType: 'creature', key: creature.key }
  })
}

function recordCreateFallback(db: Database.Database, campaignId: string, reason: string): void {
  appendEvent(db, {
    campaignId,
    type: CATALOG_CREATE_FALLBACK_EVENT,
    payload: { entityType: 'creature', reason }
  })
}

export function decideCreatureSource(
  db: Database.Database,
  campaignId: string,
  context: CreatureRetrievalContext
): CreatureSourceDecision {
  const results = retrieveCreatures(db, {
    buckets: context.buckets,
    level: context.level,
    tags: context.tags,
    limit: 1
  })
  const top = results[0]

  if (top && top.score >= RETRIEVAL_CONFIDENCE_THRESHOLD) {
    recordRetrieveHit(db, campaignId, top.entry)
    return { decision: 'retrieve', creature: top.entry, context: formatCreatureContext(top.entry) }
  }

  const reason = top ? 'no candidate met the retrieval confidence threshold' : 'no candidates available'
  recordCreateFallback(db, campaignId, reason)
  return { decision: 'create', reason }
}

export interface CatalogRetrievalStats {
  retrieveHits: number
  createFallbacks: number
  hitRate: number
}

export function getCatalogRetrievalStats(db: Database.Database, campaignId: string): CatalogRetrievalStats {
  const retrieveHits = listEventsByCampaign(db, campaignId, { type: CATALOG_RETRIEVE_HIT_EVENT }).length
  const createFallbacks = listEventsByCampaign(db, campaignId, {
    type: CATALOG_CREATE_FALLBACK_EVENT
  }).length
  const total = retrieveHits + createFallbacks
  return { retrieveHits, createFallbacks, hitRate: total === 0 ? 0 : retrieveHits / total }
}
