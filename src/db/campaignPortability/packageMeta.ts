import type Database from 'better-sqlite3'
import {
  CAMPAIGN_PACKAGE_FORMAT_VERSION,
  CAMPAIGN_PACKAGE_MAGIC,
  type PortableMetaRow
} from '../../shared/campaignPortability'

const PACKAGE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS portable_meta (
    magic TEXT NOT NULL,
    format_version INTEGER NOT NULL,
    schema_user_version INTEGER NOT NULL,
    source_campaign_id TEXT NOT NULL,
    exported_at TEXT NOT NULL,
    include_llm_usage INTEGER NOT NULL,
    include_rag_chunks INTEGER NOT NULL,
    app_version TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS portable_assets (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    logical_path TEXT NOT NULL,
    owner_entity_id TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    bytes BLOB NOT NULL
  );
`

export function ensurePackageTables(db: Database.Database): void {
  db.exec(PACKAGE_TABLES_SQL)
}

export function writePortableMeta(db: Database.Database, meta: PortableMetaRow): void {
  db.prepare('DELETE FROM portable_meta').run()
  db.prepare(
    `INSERT INTO portable_meta (
      magic, format_version, schema_user_version, source_campaign_id,
      exported_at, include_llm_usage, include_rag_chunks, app_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    meta.magic,
    meta.formatVersion,
    meta.schemaUserVersion,
    meta.sourceCampaignId,
    meta.exportedAt,
    meta.includeLlmUsage ? 1 : 0,
    meta.includeRagChunks ? 1 : 0,
    meta.appVersion
  )
}

export function readPortableMeta(db: Database.Database): PortableMetaRow | null {
  const row = db.prepare('SELECT * FROM portable_meta LIMIT 1').get() as
    | {
        magic: string
        format_version: number
        schema_user_version: number
        source_campaign_id: string
        exported_at: string
        include_llm_usage: number
        include_rag_chunks: number
        app_version: string
      }
    | undefined
  if (!row) return null
  if (row.magic !== CAMPAIGN_PACKAGE_MAGIC) return null
  if (row.format_version !== CAMPAIGN_PACKAGE_FORMAT_VERSION) {
    return {
      magic: CAMPAIGN_PACKAGE_MAGIC,
      formatVersion: row.format_version as typeof CAMPAIGN_PACKAGE_FORMAT_VERSION,
      schemaUserVersion: row.schema_user_version,
      sourceCampaignId: row.source_campaign_id,
      exportedAt: row.exported_at,
      includeLlmUsage: row.include_llm_usage === 1,
      includeRagChunks: row.include_rag_chunks === 1,
      appVersion: row.app_version
    }
  }
  return {
    magic: CAMPAIGN_PACKAGE_MAGIC,
    formatVersion: CAMPAIGN_PACKAGE_FORMAT_VERSION,
    schemaUserVersion: row.schema_user_version,
    sourceCampaignId: row.source_campaign_id,
    exportedAt: row.exported_at,
    includeLlmUsage: row.include_llm_usage === 1,
    includeRagChunks: row.include_rag_chunks === 1,
    appVersion: row.app_version
  }
}
