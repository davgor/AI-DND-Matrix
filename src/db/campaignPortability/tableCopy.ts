import type Database from 'better-sqlite3'

export type ColumnInfo = { name: string; type: string }

export function listTableColumns(db: Database.Database, table: string): ColumnInfo[] {
  return db.prepare(`PRAGMA table_info(${table})`).all() as ColumnInfo[]
}

export function selectAllRows(
  db: Database.Database,
  table: string
): Record<string, unknown>[] {
  return db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[]
}

/** Copy selected rows from source → dest with identical column names. */
export function copyRows(
  _source: Database.Database,
  dest: Database.Database,
  table: string,
  rows: Record<string, unknown>[]
): void {
  if (rows.length === 0) return
  const columns = listTableColumns(dest, table).map((column) => column.name)
  const insert = dest.prepare(
    `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`
  )
  for (const row of rows) {
    insert.run(...columns.map((column) => row[column] ?? null))
  }
}

export function withForeignKeysOff(db: Database.Database, fn: () => void): void {
  db.pragma('foreign_keys = OFF')
  try {
    fn()
  } finally {
    db.pragma('foreign_keys = ON')
  }
}
