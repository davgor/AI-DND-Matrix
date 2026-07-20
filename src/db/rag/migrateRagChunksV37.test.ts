import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { runMigrations } from '../migrations'
import { migrations } from '../schema'

function openLegacyDbAtVersion36(): Database.Database {
  const db = new Database(':memory:')
  runMigrations(
    db,
    migrations.filter((migration) => migration.version <= 36)
  )
  return db
}

function tableNames(db: Database.Database): string[] {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => (row as { name: string }).name)
}

function columnNames(db: Database.Database, table: string): string[] {
  return db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map((row) => (row as { name: string }).name)
}

function indexNames(db: Database.Database, table: string): string[] {
  return db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = ? AND name IS NOT NULL ORDER BY name"
    )
    .all(table)
    .map((row) => (row as { name: string }).name)
    .filter((name) => !name.startsWith('sqlite_autoindex_'))
}

const RAG_CHUNK_COLUMNS = [
  'id',
  'campaign_id',
  'source_table',
  'source_id',
  'region_id',
  'npc_id',
  'character_id',
  'text',
  'content_hash',
  'embedding',
  'updated_at'
]

const RAG_CHUNK_INDEXES = [
  'idx_rag_chunks_campaign',
  'idx_rag_chunks_campaign_character',
  'idx_rag_chunks_campaign_npc',
  'idx_rag_chunks_campaign_region',
  'idx_rag_chunks_campaign_source'
]

function insertSampleChunk(
  db: Database.Database,
  overrides: Partial<{
    id: string
    campaignId: string
    sourceTable: string
    sourceId: string
    contentHash: string
  }> = {}
): void {
  const id = overrides.id ?? 'chunk-1'
  const campaignId = overrides.campaignId ?? 'camp-1'
  const sourceTable = overrides.sourceTable ?? 'world_facts'
  const sourceId = overrides.sourceId ?? 'fact-1'
  const contentHash = overrides.contentHash ?? 'hash-a'
  const embedding = Buffer.from(new Float32Array([0.1, 0.2, 0.3]).buffer)

  db.prepare(
    `INSERT INTO rag_chunks (
      id, campaign_id, source_table, source_id, region_id, npc_id, character_id,
      text, content_hash, embedding, updated_at
    ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?, ?)`
  ).run(
    id,
    campaignId,
    sourceTable,
    sourceId,
    'Sample chunk text.',
    contentHash,
    embedding,
    '2026-01-01T00:00:00.000Z'
  )
}

describe('migration v37 install and upgrade', () => {
  it('creates rag_chunks and rag_backfill_state on fresh install', () => {
    const db = new Database(':memory:')
    runMigrations(db, migrations)

    expect(tableNames(db)).toContain('rag_chunks')
    expect(tableNames(db)).toContain('rag_backfill_state')
    expect(columnNames(db, 'rag_chunks')).toEqual(RAG_CHUNK_COLUMNS)
    expect(columnNames(db, 'rag_backfill_state')).toEqual([
      'campaign_id',
      'completed_at',
      'updated_at'
    ])
    expect(indexNames(db, 'rag_chunks')).toEqual(RAG_CHUNK_INDEXES)
  })

  it('upgrades a pre-v37 database without losing existing tables', () => {
    const db = openLegacyDbAtVersion36()
    const before = tableNames(db)
    expect(before).not.toContain('rag_chunks')

    runMigrations(
      db,
      migrations.filter((migration) => migration.version >= 37)
    )

    expect(tableNames(db)).toEqual(
      [...before, 'bestiary_species', 'bestiary_variants', 'quest_foe_assignments', 'rag_backfill_state', 'rag_chunks'].sort()
    )
    expect(columnNames(db, 'rag_chunks')).toEqual(RAG_CHUNK_COLUMNS)
    expect(indexNames(db, 'rag_chunks')).toEqual(RAG_CHUNK_INDEXES)
  })

  it('is idempotent when migration v37 runs twice', () => {
    const db = openLegacyDbAtVersion36()
    const v37 = migrations.filter((migration) => migration.version === 37)

    runMigrations(db, v37)
    const afterFirst = tableNames(db)

    expect(() => runMigrations(db, v37)).not.toThrow()
    expect(tableNames(db)).toEqual(afterFirst)
  })
})

describe('migration v37 unique constraint', () => {
  it('enforces one live chunk per source row via unique constraint', () => {
    const db = new Database(':memory:')
    runMigrations(db, migrations)
    insertSampleChunk(db)

    expect(() =>
      insertSampleChunk(db, { id: 'chunk-2', contentHash: 'hash-b' })
    ).toThrow(/UNIQUE constraint failed/)
  })

  it('allows the same source row in different campaigns', () => {
    const db = new Database(':memory:')
    runMigrations(db, migrations)
    insertSampleChunk(db, { campaignId: 'camp-1', sourceId: 'fact-1' })
    insertSampleChunk(db, {
      id: 'chunk-2',
      campaignId: 'camp-2',
      sourceId: 'fact-1'
    })

    const count = db.prepare('SELECT COUNT(*) AS n FROM rag_chunks').get() as { n: number }
    expect(count.n).toBe(2)
  })
})
