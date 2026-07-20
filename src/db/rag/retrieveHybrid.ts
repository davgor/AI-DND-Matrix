import type Database from 'better-sqlite3'
import {
  RAG_CHUNK_INJECTION_CAP,
  hybridRankScore,
  selectHybridRankedChunks,
  type HybridRankCandidate
} from './hybridRank'
import {
  retrieveRelevantChunks,
  type RetrievedChunk,
  type RetrievalScope,
  type RetrievalScopeIds
} from './retrieve'
import type { Embedder } from './types'

export interface RetrieveForContextParams {
  db: Database.Database
  campaignId: string
  query: string
  scope: RetrievalScope
  scopeIds?: RetrievalScopeIds
  k?: number
  embedder: Embedder
  tagMatchedSourceIds?: Set<string>
  recencyBySourceId?: Map<string, number>
  cap?: number
}

interface RecencyChunkRow {
  source_table: string
  source_id: string
  text: string
}

const RECENCY_COLUMNS = 'source_table, source_id, text'

/**
 * Semantic retrieval followed by hybrid re-ranking and hard cap trim.
 *
 * Fetches up to `max(cap * 2, k)` semantic candidates, merges tag/recency
 * metadata, then returns the top `cap` hybrid-scored chunks.
 */
export async function retrieveWithHybridRank(
  params: RetrieveForContextParams
): Promise<RetrievedChunk[]> {
  const cap = params.cap ?? RAG_CHUNK_INJECTION_CAP
  if (cap <= 0) {
    return []
  }

  const semanticK = Math.max(cap * 2, params.k ?? cap * 2)
  const semanticHits = await retrieveRelevantChunks({
    db: params.db,
    campaignId: params.campaignId,
    query: params.query,
    scope: params.scope,
    scopeIds: params.scopeIds,
    k: semanticK,
    embedder: params.embedder
  })

  const candidates = semanticHits.map((hit) => toHybridCandidate(hit, params))
  const selected = selectHybridRankedChunks(candidates, cap)
  return selected.map(toRetrievedChunk)
}

/**
 * Agent entry point: hybrid rank when embedding succeeds; recency fallback
 * when the embedder throws (see SPEC.md fallback behavior).
 */
export async function retrieveForContext(
  params: RetrieveForContextParams
): Promise<RetrievedChunk[]> {
  try {
    return await retrieveWithHybridRank(params)
  } catch {
    return loadRecencyFallbackChunks(params)
  }
}

function toHybridCandidate(
  hit: RetrievedChunk,
  params: RetrieveForContextParams
): HybridRankCandidate {
  return {
    sourceTable: hit.sourceTable,
    sourceId: hit.sourceId,
    text: hit.text,
    semanticScore: hit.score,
    tagMatch: params.tagMatchedSourceIds?.has(hit.sourceId),
    recencyScore: params.recencyBySourceId?.get(hit.sourceId)
  }
}

function toRetrievedChunk(candidate: HybridRankCandidate): RetrievedChunk {
  return {
    sourceTable: candidate.sourceTable,
    sourceId: candidate.sourceId,
    text: candidate.text,
    score: hybridRankScore(candidate)
  }
}

interface LoadScopedChunksByRecencyParams {
  db: Database.Database
  campaignId: string
  scope: RetrievalScope
  scopeIds: RetrievalScopeIds | undefined
  limit: number
}

function loadRecencyFallbackChunks(params: RetrieveForContextParams): RetrievedChunk[] {
  const cap = params.cap ?? RAG_CHUNK_INJECTION_CAP
  if (cap <= 0) {
    return []
  }

  const rows = loadScopedChunksByRecency({
    db: params.db,
    campaignId: params.campaignId,
    scope: params.scope,
    scopeIds: params.scopeIds,
    limit: cap
  })

  return rows.map((row) => ({
    sourceTable: row.source_table,
    sourceId: row.source_id,
    text: row.text,
    score: 0
  }))
}

function loadScopedChunksByRecency(params: LoadScopedChunksByRecencyParams): RecencyChunkRow[] {
  const { db, campaignId, scope, scopeIds, limit } = params
  const loaders: Record<RetrievalScope, () => RecencyChunkRow[]> = {
    campaign: () => loadCampaignChunksByRecency(db, campaignId, limit),
    region: () =>
      loadRegionChunksByRecency(
        db,
        campaignId,
        requireScopeId(scopeIds?.regionId, 'regionId', 'region'),
        limit
      ),
    character: () =>
      loadCharacterChunksByRecency(
        db,
        campaignId,
        requireScopeId(scopeIds?.characterId, 'characterId', 'character'),
        limit
      ),
    npc: () => loadNpcChunksByRecency(db, campaignId, scopeIds, limit)
  }
  return loaders[scope]()
}

function requireScopeId(value: string | undefined, field: string, scope: string): string {
  if (!value) {
    throw new Error(`scope "${scope}" requires scopeIds.${field}`)
  }
  return value
}

function loadCampaignChunksByRecency(
  db: Database.Database,
  campaignId: string,
  limit: number
): RecencyChunkRow[] {
  return db
    .prepare(
      `SELECT ${RECENCY_COLUMNS}
       FROM rag_chunks
       WHERE campaign_id = ?
       ORDER BY updated_at DESC
       LIMIT ?`
    )
    .all(campaignId, limit) as RecencyChunkRow[]
}

function loadRegionChunksByRecency(
  db: Database.Database,
  campaignId: string,
  regionId: string,
  limit: number
): RecencyChunkRow[] {
  return db
    .prepare(
      `SELECT ${RECENCY_COLUMNS}
       FROM rag_chunks
       WHERE campaign_id = ? AND region_id = ?
       ORDER BY updated_at DESC
       LIMIT ?`
    )
    .all(campaignId, regionId, limit) as RecencyChunkRow[]
}

function loadCharacterChunksByRecency(
  db: Database.Database,
  campaignId: string,
  characterId: string,
  limit: number
): RecencyChunkRow[] {
  return db
    .prepare(
      `SELECT ${RECENCY_COLUMNS}
       FROM rag_chunks
       WHERE campaign_id = ? AND character_id = ?
       ORDER BY updated_at DESC
       LIMIT ?`
    )
    .all(campaignId, characterId, limit) as RecencyChunkRow[]
}

function loadNpcChunksByRecency(
  db: Database.Database,
  campaignId: string,
  scopeIds: RetrievalScopeIds | undefined,
  limit: number
): RecencyChunkRow[] {
  const npcId = requireScopeId(scopeIds?.npcId, 'npcId', 'npc')
  const regionId = scopeIds?.regionId
  if (regionId) {
    return db
      .prepare(
        `SELECT ${RECENCY_COLUMNS}
         FROM rag_chunks
         WHERE campaign_id = ?
           AND (
             npc_id = ?
             OR (source_table = 'world_facts' AND region_id = ?)
           )
         ORDER BY updated_at DESC
         LIMIT ?`
      )
      .all(campaignId, npcId, regionId, limit) as RecencyChunkRow[]
  }
  return db
    .prepare(
      `SELECT ${RECENCY_COLUMNS}
       FROM rag_chunks
       WHERE campaign_id = ? AND npc_id = ?
       ORDER BY updated_at DESC
       LIMIT ?`
    )
    .all(campaignId, npcId, limit) as RecencyChunkRow[]
}
