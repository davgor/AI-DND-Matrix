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

interface MetaFilter {
  sql: string
  args: unknown[]
}

interface LoadChunksArgs {
  db: Database.Database
  campaignId: string
  meta: MetaFilter
}

const CHUNK_COLUMNS = 'source_table, source_id, text, embedding'

function ragHasEmbedderMeta(db: Database.Database): boolean {
  const columns = db.prepare(`PRAGMA table_info(rag_chunks)`).all() as Array<{ name: string }>
  return columns.some((column) => column.name === 'embedder_id')
}

function buildMetaFilter(db: Database.Database, embedder: Embedder): MetaFilter {
  if (!ragHasEmbedderMeta(db)) {
    return { sql: '', args: [] }
  }
  return {
    sql: ' AND embedder_id = ? AND model_id = ? AND embedding_dim = ?',
    args: [embedder.name, embedder.modelId, embedder.dimension]
  }
}

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
 *
 * When embedder meta columns exist, only same-space vectors are scored.
 */
export async function retrieveRelevantChunks(
  params: RetrieveRelevantChunksParams
): Promise<RetrievedChunk[]> {
  const { db, campaignId, query, scope, scopeIds, k, embedder } = params

  if (k <= 0) {
    return []
  }

  const rows = loadScopedChunks({ db, campaignId, scope, scopeIds, embedder })
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

function loadScopedChunks(input: {
  db: Database.Database
  campaignId: string
  scope: RetrievalScope
  scopeIds: RetrievalScopeIds | undefined
  embedder: Embedder
}): RagChunkRow[] {
  const meta = buildMetaFilter(input.db, input.embedder)
  const args: LoadChunksArgs = {
    db: input.db,
    campaignId: input.campaignId,
    meta
  }
  const loaders: Record<RetrievalScope, () => RagChunkRow[]> = {
    campaign: () => loadCampaignChunks(args),
    region: () =>
      loadRegionChunks(args, requireScopeId(input.scopeIds?.regionId, 'regionId', 'region')),
    character: () =>
      loadCharacterChunks(
        args,
        requireScopeId(input.scopeIds?.characterId, 'characterId', 'character')
      ),
    npc: () => loadNpcChunks(args, input.scopeIds)
  }
  return loaders[input.scope]()
}

function requireScopeId(value: string | undefined, field: string, scope: string): string {
  if (!value) {
    throw new Error(`scope "${scope}" requires scopeIds.${field}`)
  }
  return value
}

function loadCampaignChunks(args: LoadChunksArgs): RagChunkRow[] {
  return args.db
    .prepare(
      `SELECT ${CHUNK_COLUMNS}
       FROM rag_chunks
       WHERE campaign_id = ?${args.meta.sql}`
    )
    .all(args.campaignId, ...args.meta.args) as RagChunkRow[]
}

function loadRegionChunks(args: LoadChunksArgs, regionId: string): RagChunkRow[] {
  return args.db
    .prepare(
      `SELECT ${CHUNK_COLUMNS}
       FROM rag_chunks
       WHERE campaign_id = ? AND region_id = ?${args.meta.sql}`
    )
    .all(args.campaignId, regionId, ...args.meta.args) as RagChunkRow[]
}

function loadCharacterChunks(args: LoadChunksArgs, characterId: string): RagChunkRow[] {
  return args.db
    .prepare(
      `SELECT ${CHUNK_COLUMNS}
       FROM rag_chunks
       WHERE campaign_id = ? AND character_id = ?${args.meta.sql}`
    )
    .all(args.campaignId, characterId, ...args.meta.args) as RagChunkRow[]
}

function loadNpcChunks(
  args: LoadChunksArgs,
  scopeIds: RetrievalScopeIds | undefined
): RagChunkRow[] {
  const npcId = requireScopeId(scopeIds?.npcId, 'npcId', 'npc')
  const regionId = scopeIds?.regionId
  if (regionId) {
    return args.db
      .prepare(
        `SELECT ${CHUNK_COLUMNS}
         FROM rag_chunks
         WHERE campaign_id = ?
           AND (
             npc_id = ?
             OR (source_table = 'world_facts' AND region_id = ?)
           )${args.meta.sql}`
      )
      .all(args.campaignId, npcId, regionId, ...args.meta.args) as RagChunkRow[]
  }
  return args.db
    .prepare(
      `SELECT ${CHUNK_COLUMNS}
       FROM rag_chunks
       WHERE campaign_id = ? AND npc_id = ?${args.meta.sql}`
    )
    .all(args.campaignId, npcId, ...args.meta.args) as RagChunkRow[]
}
