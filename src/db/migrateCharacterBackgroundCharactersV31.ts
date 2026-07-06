import type Database from 'better-sqlite3'
import {
  CHARACTERS_V31_DDL,
  COPY_CHARACTERS_TO_V31_SQL
} from './migrateCharacterBackgroundCharactersV31Sql'

function constraintIncludesBackground(db: Database.Database): boolean {
  const row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'characters'")
    .get() as { sql: string } | undefined
  return row?.sql.includes("'background'") ?? false
}

export function migrateCharacterBackgroundCharactersV31(db: Database.Database): void {
  if (constraintIncludesBackground(db)) {
    return
  }

  db.pragma('foreign_keys = OFF')
  db.exec(CHARACTERS_V31_DDL)
  db.exec(COPY_CHARACTERS_TO_V31_SQL)
  db.exec('DROP TABLE characters; ALTER TABLE characters_v31 RENAME TO characters;')
  db.pragma('foreign_keys = ON')
}
