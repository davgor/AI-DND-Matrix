import type Database from 'better-sqlite3'
import {
  CHARACTERS_V26_DDL,
  COPY_CHARACTERS_TO_V26_SQL
} from './migrateGuidedCreationEquipmentPhaseV26Sql'

function constraintIncludesEquipment(db: Database.Database): boolean {
  const row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'characters'")
    .get() as { sql: string } | undefined
  return row?.sql.includes("'equipment'") ?? false
}

export function migrateGuidedCreationEquipmentPhaseV26(db: Database.Database): void {
  if (constraintIncludesEquipment(db)) {
    return
  }

  db.pragma('foreign_keys = OFF')
  db.exec(CHARACTERS_V26_DDL)
  db.exec(COPY_CHARACTERS_TO_V26_SQL)
  db.exec('DROP TABLE characters; ALTER TABLE characters_v26 RENAME TO characters;')
  db.pragma('foreign_keys = ON')
}
