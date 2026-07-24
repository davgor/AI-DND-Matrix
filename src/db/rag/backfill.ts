import type Database from 'better-sqlite3'
import type { Embedder } from './types'
import { upsertRagChunk } from './upsertChunk'

export const RAG_BACKFILL_BATCH_SIZE = 50

export interface BackfillCampaignRagParams {
  db: Database.Database
  campaignId: string
  embedder: Embedder
  batchSize?: number
}

export interface BackfillCampaignRagResult {
  processed: number
  completed: boolean
}

interface BackfillStateRow {
  completed_at: string | null
}

interface PendingChunkRow {
  source_table: string
  source_id: string
  region_id: string | null
  npc_id: string | null
  text: string
}

const MISMATCH = `(rc.embedder_id IS NULL OR rc.embedder_id != ? OR rc.model_id IS NULL OR rc.model_id != ? OR rc.embedding_dim IS NULL OR rc.embedding_dim != ?)`

const PENDING_MISSING_SQL = `
  SELECT 'world_facts' AS source_table, wf.id AS source_id, wf.region_id, NULL AS npc_id, wf.content AS text
  FROM world_facts wf
  WHERE wf.campaign_id = ?
    AND NOT EXISTS (
      SELECT 1 FROM rag_chunks rc
      WHERE rc.campaign_id = wf.campaign_id
        AND rc.source_table = 'world_facts' AND rc.source_id = wf.id
    )
  UNION ALL
  SELECT 'npc_memories', nm.id, n.region_id, nm.npc_id, nm.content
  FROM npc_memories nm
  INNER JOIN npcs n ON n.id = nm.npc_id
  WHERE n.campaign_id = ?
    AND NOT EXISTS (
      SELECT 1 FROM rag_chunks rc
      WHERE rc.campaign_id = n.campaign_id
        AND rc.source_table = 'npc_memories' AND rc.source_id = nm.id
    )
  UNION ALL
  SELECT 'region_history', rh.id, rh.region_id, NULL, rh.content
  FROM region_history rh
  INNER JOIN regions r ON r.id = rh.region_id
  WHERE r.campaign_id = ?
    AND NOT EXISTS (
      SELECT 1 FROM rag_chunks rc
      WHERE rc.campaign_id = r.campaign_id
        AND rc.source_table = 'region_history' AND rc.source_id = rh.id
    )
  LIMIT ?
`

const PENDING_STALE_SQL = `
  SELECT 'world_facts' AS source_table, wf.id AS source_id, wf.region_id, NULL AS npc_id, wf.content AS text
  FROM world_facts wf
  WHERE wf.campaign_id = ?
    AND (
      NOT EXISTS (
        SELECT 1 FROM rag_chunks rc
        WHERE rc.campaign_id = wf.campaign_id
          AND rc.source_table = 'world_facts' AND rc.source_id = wf.id
      )
      OR EXISTS (
        SELECT 1 FROM rag_chunks rc
        WHERE rc.campaign_id = wf.campaign_id
          AND rc.source_table = 'world_facts' AND rc.source_id = wf.id
          AND ${MISMATCH}
      )
    )
  UNION ALL
  SELECT 'npc_memories', nm.id, n.region_id, nm.npc_id, nm.content
  FROM npc_memories nm
  INNER JOIN npcs n ON n.id = nm.npc_id
  WHERE n.campaign_id = ?
    AND (
      NOT EXISTS (
        SELECT 1 FROM rag_chunks rc
        WHERE rc.campaign_id = n.campaign_id
          AND rc.source_table = 'npc_memories' AND rc.source_id = nm.id
      )
      OR EXISTS (
        SELECT 1 FROM rag_chunks rc
        WHERE rc.campaign_id = n.campaign_id
          AND rc.source_table = 'npc_memories' AND rc.source_id = nm.id
          AND ${MISMATCH}
      )
    )
  UNION ALL
  SELECT 'region_history', rh.id, rh.region_id, NULL, rh.content
  FROM region_history rh
  INNER JOIN regions r ON r.id = rh.region_id
  WHERE r.campaign_id = ?
    AND (
      NOT EXISTS (
        SELECT 1 FROM rag_chunks rc
        WHERE rc.campaign_id = r.campaign_id
          AND rc.source_table = 'region_history' AND rc.source_id = rh.id
      )
      OR EXISTS (
        SELECT 1 FROM rag_chunks rc
        WHERE rc.campaign_id = r.campaign_id
          AND rc.source_table = 'region_history' AND rc.source_id = rh.id
          AND ${MISMATCH}
      )
    )
  LIMIT ?
`

function ragBackfillReady(db: Database.Database): boolean {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM sqlite_master
       WHERE type = 'table' AND name IN ('rag_chunks', 'rag_backfill_state')`
    )
    .get() as { c: number }
  return row.c === 2
}

function ragHasEmbedderMeta(db: Database.Database): boolean {
  const columns = db.prepare(`PRAGMA table_info(rag_chunks)`).all() as Array<{ name: string }>
  return columns.some((column) => column.name === 'embedder_id')
}

function isBackfillComplete(db: Database.Database, campaignId: string): boolean {
  const row = db
    .prepare('SELECT completed_at FROM rag_backfill_state WHERE campaign_id = ?')
    .get(campaignId) as BackfillStateRow | undefined
  return row?.completed_at != null
}

function embedderMetaArgs(embedder: Embedder): [string, string, number] {
  return [embedder.name, embedder.modelId, embedder.dimension]
}

function fetchPendingBatch(
  db: Database.Database,
  campaignId: string,
  embedder: Embedder,
  batchSize: number
): PendingChunkRow[] {
  if (!ragHasEmbedderMeta(db)) {
    return db
      .prepare(PENDING_MISSING_SQL)
      .all(campaignId, campaignId, campaignId, batchSize) as PendingChunkRow[]
  }
  const meta = embedderMetaArgs(embedder)
  return db
    .prepare(PENDING_STALE_SQL)
    .all(
      campaignId,
      ...meta,
      campaignId,
      ...meta,
      campaignId,
      ...meta,
      batchSize
    ) as PendingChunkRow[]
}

function markBackfillComplete(db: Database.Database, campaignId: string): void {
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO rag_backfill_state (campaign_id, completed_at, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(campaign_id) DO UPDATE SET
       completed_at = excluded.completed_at,
       updated_at = excluded.updated_at`
  ).run(campaignId, now, now)
}

async function upsertPendingChunk(
  db: Database.Database,
  campaignId: string,
  row: PendingChunkRow,
  embedder: Embedder
): Promise<void> {
  await upsertRagChunk({
    db,
    campaignId,
    sourceTable: row.source_table,
    sourceId: row.source_id,
    regionId: row.region_id,
    npcId: row.npc_id,
    text: row.text,
    embedder
  })
}

async function processBatch(
  db: Database.Database,
  campaignId: string,
  batch: PendingChunkRow[],
  embedder: Embedder
): Promise<void> {
  for (const row of batch) {
    await upsertPendingChunk(db, campaignId, row, embedder)
  }
}

export async function backfillCampaignRag(
  params: BackfillCampaignRagParams
): Promise<BackfillCampaignRagResult> {
  const { db, campaignId, embedder, batchSize = RAG_BACKFILL_BATCH_SIZE } = params

  if (!ragBackfillReady(db)) {
    return { processed: 0, completed: false }
  }

  if (isBackfillComplete(db, campaignId)) {
    return { processed: 0, completed: true }
  }

  let processed = 0
  while (true) {
    const batch = fetchPendingBatch(db, campaignId, embedder, batchSize)
    if (batch.length === 0) {
      break
    }
    await processBatch(db, campaignId, batch, embedder)
    processed += batch.length
  }

  markBackfillComplete(db, campaignId)
  return { processed, completed: true }
}

export async function ensureCampaignRagBackfill(
  params: BackfillCampaignRagParams
): Promise<BackfillCampaignRagResult> {
  if (isBackfillComplete(params.db, params.campaignId)) {
    return { processed: 0, completed: true }
  }
  return backfillCampaignRag(params)
}
