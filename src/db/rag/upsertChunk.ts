import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import { contentHash } from './contentHash'
import { packEmbedding } from './embeddingBlob'
import { selectEmbedder } from './selectEmbedder'
import type { Embedder } from './types'

export interface UpsertRagChunkInput {
  db: Database.Database
  campaignId: string
  sourceTable: string
  sourceId: string
  text: string
  embedder: Embedder
  regionId?: string | null
  npcId?: string | null
  characterId?: string | null
}

interface ExistingChunkRow {
  id: string
  content_hash: string
  embedder_id?: string
  model_id?: string
  embedding_dim?: number
}

interface PersistChunkArgs {
  db: Database.Database
  input: UpsertRagChunkInput
  id: string
  hash: string
  embeddingBlob: Buffer
}

let defaultEmbedder: Embedder | undefined

export function resolveEmbedder(override?: Embedder): Embedder {
  if (override) {
    return override
  }
  defaultEmbedder ??= selectEmbedder(process.env.RAG_EMBEDDER ?? 'lexical')
  return defaultEmbedder
}

function ragChunksReady(db: Database.Database): boolean {
  const row = db
    .prepare(
      `SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = 'rag_chunks'`
    )
    .get() as { ok: number } | undefined
  return row !== undefined
}

function ragHasEmbedderMeta(db: Database.Database): boolean {
  const columns = db.prepare(`PRAGMA table_info(rag_chunks)`).all() as Array<{ name: string }>
  return columns.some((column) => column.name === 'embedder_id')
}

function findExistingChunk(
  db: Database.Database,
  campaignId: string,
  sourceTable: string,
  sourceId: string
): ExistingChunkRow | undefined {
  const withMeta = ragHasEmbedderMeta(db)
  const sql = withMeta
    ? `SELECT id, content_hash, embedder_id, model_id, embedding_dim
       FROM rag_chunks
       WHERE campaign_id = ? AND source_table = ? AND source_id = ?`
    : `SELECT id, content_hash
       FROM rag_chunks
       WHERE campaign_id = ? AND source_table = ? AND source_id = ?`
  return db.prepare(sql).get(campaignId, sourceTable, sourceId) as ExistingChunkRow | undefined
}

function chunkMatchesEmbedder(existing: ExistingChunkRow, embedder: Embedder): boolean {
  if (existing.embedder_id == null) {
    return true
  }
  return (
    existing.embedder_id === embedder.name &&
    existing.model_id === embedder.modelId &&
    existing.embedding_dim === embedder.dimension
  )
}

function persistChunkWithMeta(args: PersistChunkArgs, updatedAt: string): void {
  const { db, input, id, hash, embeddingBlob } = args
  db.prepare(
    `INSERT INTO rag_chunks (
      id, campaign_id, source_table, source_id, region_id, npc_id, character_id,
      text, content_hash, embedding, updated_at, embedder_id, model_id, embedding_dim
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(campaign_id, source_table, source_id) DO UPDATE SET
      region_id = excluded.region_id,
      npc_id = excluded.npc_id,
      character_id = excluded.character_id,
      text = excluded.text,
      content_hash = excluded.content_hash,
      embedding = excluded.embedding,
      updated_at = excluded.updated_at,
      embedder_id = excluded.embedder_id,
      model_id = excluded.model_id,
      embedding_dim = excluded.embedding_dim`
  ).run(
    id,
    input.campaignId,
    input.sourceTable,
    input.sourceId,
    input.regionId ?? null,
    input.npcId ?? null,
    input.characterId ?? null,
    input.text,
    hash,
    embeddingBlob,
    updatedAt,
    input.embedder.name,
    input.embedder.modelId,
    input.embedder.dimension
  )
}

function persistChunkLegacy(args: PersistChunkArgs, updatedAt: string): void {
  const { db, input, id, hash, embeddingBlob } = args
  db.prepare(
    `INSERT INTO rag_chunks (
      id, campaign_id, source_table, source_id, region_id, npc_id, character_id,
      text, content_hash, embedding, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(campaign_id, source_table, source_id) DO UPDATE SET
      region_id = excluded.region_id,
      npc_id = excluded.npc_id,
      character_id = excluded.character_id,
      text = excluded.text,
      content_hash = excluded.content_hash,
      embedding = excluded.embedding,
      updated_at = excluded.updated_at`
  ).run(
    id,
    input.campaignId,
    input.sourceTable,
    input.sourceId,
    input.regionId ?? null,
    input.npcId ?? null,
    input.characterId ?? null,
    input.text,
    hash,
    embeddingBlob,
    updatedAt
  )
}

function persistChunk(args: PersistChunkArgs): void {
  const updatedAt = new Date().toISOString()
  if (ragHasEmbedderMeta(args.db)) {
    persistChunkWithMeta(args, updatedAt)
    return
  }
  persistChunkLegacy(args, updatedAt)
}

export async function upsertRagChunk(input: UpsertRagChunkInput): Promise<void> {
  if (!ragChunksReady(input.db)) {
    return
  }

  const hash = contentHash(input.text)
  const existing = findExistingChunk(
    input.db,
    input.campaignId,
    input.sourceTable,
    input.sourceId
  )

  if (existing?.content_hash === hash && chunkMatchesEmbedder(existing, input.embedder)) {
    return
  }

  const vectors = await input.embedder.embed([input.text])
  const embedding = vectors[0]
  if (!embedding) {
    throw new Error('Embedder returned no vectors')
  }

  persistChunk({
    db: input.db,
    input,
    id: existing?.id ?? randomUUID(),
    hash,
    embeddingBlob: packEmbedding(embedding, input.embedder.dimension)
  })
}
