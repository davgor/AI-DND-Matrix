import type Database from 'better-sqlite3'

const RAG_CHUNKS_V37_SQL = `
  CREATE TABLE IF NOT EXISTS rag_chunks (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    source_table TEXT NOT NULL,
    source_id TEXT NOT NULL,
    region_id TEXT NULL,
    npc_id TEXT NULL,
    character_id TEXT NULL,
    text TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    embedding BLOB NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(campaign_id, source_table, source_id)
  );

  CREATE INDEX IF NOT EXISTS idx_rag_chunks_campaign ON rag_chunks(campaign_id);
  CREATE INDEX IF NOT EXISTS idx_rag_chunks_campaign_region ON rag_chunks(campaign_id, region_id);
  CREATE INDEX IF NOT EXISTS idx_rag_chunks_campaign_npc ON rag_chunks(campaign_id, npc_id);
  CREATE INDEX IF NOT EXISTS idx_rag_chunks_campaign_character ON rag_chunks(campaign_id, character_id);
  CREATE INDEX IF NOT EXISTS idx_rag_chunks_campaign_source ON rag_chunks(campaign_id, source_table);

  CREATE TABLE IF NOT EXISTS rag_backfill_state (
    campaign_id TEXT PRIMARY KEY,
    completed_at TEXT NULL,
    updated_at TEXT NOT NULL
  );
`

export function migrateRagChunksV37(db: Database.Database): void {
  db.exec(RAG_CHUNKS_V37_SQL)
}
