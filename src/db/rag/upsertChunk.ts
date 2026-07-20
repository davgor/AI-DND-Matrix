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
  defaultEmbedder ??= selectEmbedder(process.env.RAG_EMBEDDER ?? 'local')
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

function findExistingChunk(
  db: Database.Database,
  campaignId: string,
  sourceTable: string,
  sourceId: string
): ExistingChunkRow | undefined {
  return db
    .prepare(
      `SELECT id, content_hash
       FROM rag_chunks
       WHERE campaign_id = ? AND source_table = ? AND source_id = ?`
    )
    .get(campaignId, sourceTable, sourceId) as ExistingChunkRow | undefined
}

function persistChunk(args: PersistChunkArgs): void {
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
    new Date().toISOString()
  )
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

  if (existing?.content_hash === hash) {
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
    embeddingBlob: packEmbedding(embedding)
  })
}
