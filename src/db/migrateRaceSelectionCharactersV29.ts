import type Database from 'better-sqlite3'
import {
  CHARACTERS_V29_DDL,
  COPY_CHARACTERS_TO_V29_SQL
} from './migrateRaceSelectionCharactersV29Sql'

function constraintIncludesRace(db: Database.Database): boolean {
  const row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'characters'")
    .get() as { sql: string } | undefined
  return row?.sql.includes("'race'") ?? false
}

export function migrateRaceSelectionCharactersV29(db: Database.Database): void {
  if (constraintIncludesRace(db)) {
    return
  }

  db.pragma('foreign_keys = OFF')
  db.exec(CHARACTERS_V29_DDL)
  db.exec(COPY_CHARACTERS_TO_V29_SQL)
  db.exec('DROP TABLE characters; ALTER TABLE characters_v29 RENAME TO characters;')
  db.pragma('foreign_keys = ON')
}
