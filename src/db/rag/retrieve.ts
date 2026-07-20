import type Database from 'better-sqlite3'
import { cosineSimilarity } from './cosine'
import { unpackEmbedding } from './embeddingBlob'
import type { Embedder } from './types'

export type RetrievalScope = 'campaign' | 'region' | 'npc' | 'character'

export interface RetrievalScopeIds {
  regionId?: string
  npcId?: string
  characterId?: string
  factionTag?: string
}

export interface RetrievedChunk {
  sourceTable: string
  sourceId: string
  text: string
  score: number
}

export interface RetrieveRelevantChunksParams {
  db: Database.Database
  campaignId: string
  query: string
  scope: RetrievalScope
  scopeIds?: RetrievalScopeIds
  k: number
  embedder: Embedder
}

interface RagChunkRow {
  source_table: string
  source_id: string
  text: string
  embedding: Buffer
}

const CHUNK_COLUMNS = 'source_table, source_id, text, embedding'

/**
 * Semantic retrieval over indexed rag_chunks for a campaign.
 *
 * Scope filters:
 * - `campaign` — all chunks for the campaign.
 * - `region` — chunks with matching `region_id` (requires `scopeIds.regionId`).
 * - `character` — chunks with matching `character_id` (requires `scopeIds.characterId`).
 * - `npc` — requires `scopeIds.npcId`. Returns (a) chunks with `npc_id = npcId`, and
 *   (b) when `scopeIds.regionId` is set, `world_facts` chunks with that `region_id`.
 *   Optional `factionTag` is reserved for hybrid rank (**083.9**); not applied here.
 */
export async function retrieveRelevantChunks(
  params: RetrieveRelevantChunksParams
): Promise<RetrievedChunk[]> {
  const { db, campaignId, query, scope, scopeIds, k, embedder } = params

  if (k <= 0) {
    return []
  }

  const rows = loadScopedChunks(db, campaignId, scope, scopeIds)
  if (rows.length === 0) {
    return []
  }

  const [queryVector] = await embedder.embed([query])
  if (!queryVector) {
    return []
  }

  const scored = rows.map((row) => ({
    sourceTable: row.source_table,
    sourceId: row.source_id,
    text: row.text,
    score: cosineSimilarity(queryVector, unpackEmbedding(row.embedding))
  }))

  scored.sort((left, right) => right.score - left.score)
  return scored.slice(0, k)
}

function loadScopedChunks(
  db: Database.Database,
  campaignId: string,
  scope: RetrievalScope,
  scopeIds: RetrievalScopeIds | undefined
): RagChunkRow[] {
  const loaders: Record<RetrievalScope, () => RagChunkRow[]> = {
    campaign: () => loadCampaignChunks(db, campaignId),
    region: () => loadRegionChunks(db, campaignId, requireScopeId(scopeIds?.regionId, 'regionId', 'region')),
    character: () =>
      loadCharacterChunks(db, campaignId, requireScopeId(scopeIds?.characterId, 'characterId', 'character')),
    npc: () => loadNpcChunks(db, campaignId, scopeIds)
  }
  return loaders[scope]()
}

function requireScopeId(value: string | undefined, field: string, scope: string): string {
  if (!value) {
    throw new Error(`scope "${scope}" requires scopeIds.${field}`)
  }
  return value
}

function loadCampaignChunks(db: Database.Database, campaignId: string): RagChunkRow[] {
  return db
    .prepare(
      `SELECT ${CHUNK_COLUMNS}
       FROM rag_chunks
       WHERE campaign_id = ?`
    )
    .all(campaignId) as RagChunkRow[]
}

function loadRegionChunks(
  db: Database.Database,
  campaignId: string,
  regionId: string
): RagChunkRow[] {
  return db
    .prepare(
      `SELECT ${CHUNK_COLUMNS}
       FROM rag_chunks
       WHERE campaign_id = ? AND region_id = ?`
    )
    .all(campaignId, regionId) as RagChunkRow[]
}

function loadCharacterChunks(
  db: Database.Database,
  campaignId: string,
  characterId: string
): RagChunkRow[] {
  return db
    .prepare(
      `SELECT ${CHUNK_COLUMNS}
       FROM rag_chunks
       WHERE campaign_id = ? AND character_id = ?`
    )
    .all(campaignId, characterId) as RagChunkRow[]
}

function loadNpcChunks(
  db: Database.Database,
  campaignId: string,
  scopeIds: RetrievalScopeIds | undefined
): RagChunkRow[] {
  const npcId = requireScopeId(scopeIds?.npcId, 'npcId', 'npc')
  const regionId = scopeIds?.regionId
  if (regionId) {
    return db
      .prepare(
        `SELECT ${CHUNK_COLUMNS}
         FROM rag_chunks
         WHERE campaign_id = ?
           AND (
             npc_id = ?
             OR (source_table = 'world_facts' AND region_id = ?)
           )`
      )
      .all(campaignId, npcId, regionId) as RagChunkRow[]
  }
  return db
    .prepare(
      `SELECT ${CHUNK_COLUMNS}
       FROM rag_chunks
       WHERE campaign_id = ? AND npc_id = ?`
    )
    .all(campaignId, npcId) as RagChunkRow[]
}
