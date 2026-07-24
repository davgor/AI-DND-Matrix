/**
 * Invalidate / clear campaign RAG index when embedder mode or model changes (154.5).
 */

import type Database from 'better-sqlite3'

function ragTablesReady(db: Database.Database): boolean {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM sqlite_master
       WHERE type = 'table' AND name IN ('rag_chunks', 'rag_backfill_state')`
    )
    .get() as { c: number }
  return row.c === 2
}

/** Clear backfill completion so ensureCampaignRagBackfill will run again. */
export function invalidateCampaignRagBackfill(
  db: Database.Database,
  campaignId: string
): void {
  if (!ragTablesReady(db)) {
    return
  }
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO rag_backfill_state (campaign_id, completed_at, updated_at)
     VALUES (?, NULL, ?)
     ON CONFLICT(campaign_id) DO UPDATE SET
       completed_at = NULL,
       updated_at = excluded.updated_at`
  ).run(campaignId, now)
}

/**
 * Wipe campaign rag_chunks and clear backfill state.
 * Prevents mixed vector spaces after embedder/mode change.
 */
export function clearCampaignRagIndex(db: Database.Database, campaignId: string): void {
  if (!ragTablesReady(db)) {
    return
  }
  db.prepare('DELETE FROM rag_chunks WHERE campaign_id = ?').run(campaignId)
  invalidateCampaignRagBackfill(db, campaignId)
}

/**
 * Full mode/model change: wipe old-space vectors and reopen backfill.
 */
export function invalidateCampaignRagForEmbedderChange(
  db: Database.Database,
  campaignId: string
): void {
  clearCampaignRagIndex(db, campaignId)
}
