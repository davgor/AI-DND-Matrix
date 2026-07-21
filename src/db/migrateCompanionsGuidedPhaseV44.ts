import type Database from 'better-sqlite3'
import {
  CHARACTERS_V44_DDL,
  COPY_CHARACTERS_TO_V44_SQL
} from './migrateCompanionsGuidedPhaseV44Sql'

function constraintIncludesCompanions(db: Database.Database): boolean {
  const row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'characters'")
    .get() as { sql: string } | undefined
  return row?.sql.includes("'companions'") ?? false
}

export function migrateCompanionsGuidedPhaseV44(db: Database.Database): void {
  if (constraintIncludesCompanions(db)) {
    return
  }

  db.pragma('foreign_keys = OFF')
  db.exec(CHARACTERS_V44_DDL)
  db.exec(COPY_CHARACTERS_TO_V44_SQL)
  db.exec('DROP TABLE characters; ALTER TABLE characters_v44 RENAME TO characters;')
  db.pragma('foreign_keys = ON')
}
