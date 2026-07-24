import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { runMigrations } from '../migrations'
import { migrations } from '../schema'
import { migrateRagChunksV37 } from './migrateRagChunksV37'
import { migrateRagEmbedderMetaV57 } from './migrateRagEmbedderMetaV57'

function columnNames(db: Database.Database, table: string): string[] {
  return db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map((row) => (row as { name: string }).name)
}

describe('migrateRagEmbedderMetaV57', () => {
  it('adds embedder metadata columns and backfills lexical defaults', () => {
    const db = new Database(':memory:')
    migrateRagChunksV37(db)
    db.prepare(
      `INSERT INTO rag_chunks (
        id, campaign_id, source_table, source_id, region_id, npc_id, character_id,
        text, content_hash, embedding, updated_at
      ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?, ?)`
    ).run(
      'c1',
      'camp',
      'world_facts',
      'f1',
      'the keep burned',
      'hash',
      Buffer.from(new Float32Array(256).buffer),
      new Date().toISOString()
    )

    migrateRagEmbedderMetaV57(db)

    expect(columnNames(db, 'rag_chunks')).toEqual(
      expect.arrayContaining(['embedder_id', 'model_id', 'embedding_dim'])
    )

    const row = db
      .prepare(
        `SELECT embedder_id, model_id, embedding_dim FROM rag_chunks WHERE id = ?`
      )
      .get('c1') as { embedder_id: string; model_id: string; embedding_dim: number }

    expect(row.embedder_id).toBe('lexical')
    expect(row.model_id).toBe('hashed-bow-v1')
    expect(row.embedding_dim).toBe(256)
  })

  it('is applied by schema migrations at version 57', () => {
    const db = new Database(':memory:')
    runMigrations(db, migrations)
    expect(columnNames(db, 'rag_chunks')).toEqual(
      expect.arrayContaining(['embedder_id', 'model_id', 'embedding_dim'])
    )
  })
})
