import type Database from 'better-sqlite3'

/**
 * Epic 154 — tag rag_chunks with embedder identity so vector spaces never mix.
 * Existing rows backfilled as lexical / hashed-bow-v1 / 256.
 * Clearing rag_backfill_state forces re-embed when callers switch embedder (154.5).
 */
export function migrateRagEmbedderMetaV57(db: Database.Database): void {
  addColumnIfMissing(db, 'rag_chunks', 'embedder_id', "TEXT NOT NULL DEFAULT 'lexical'")
  addColumnIfMissing(db, 'rag_chunks', 'model_id', "TEXT NOT NULL DEFAULT 'hashed-bow-v1'")
  addColumnIfMissing(db, 'rag_chunks', 'embedding_dim', 'INTEGER NOT NULL DEFAULT 256')

  db.prepare(
    `UPDATE rag_chunks
     SET embedder_id = 'lexical',
         model_id = 'hashed-bow-v1',
         embedding_dim = 256
     WHERE embedder_id IS NULL
        OR embedder_id = ''
        OR model_id IS NULL
        OR model_id = ''
        OR embedding_dim IS NULL
        OR embedding_dim = 0`
  ).run()
}

function addColumnIfMissing(
  db: Database.Database,
  table: string,
  column: string,
  definition: string
): void {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  if (rows.some((row) => row.name === column)) {
    return
  }
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}
