import Database from 'better-sqlite3'
import { runMigrations } from './migrations'
import { migrations } from './schema'

export function createTestDb(): Database.Database {
  const db = new Database(':memory:')
  runMigrations(db, migrations)
  return db
}

/** Adds race/background columns on legacy fixture DBs without jumping past pending migrations. */
export function ensureLegacyRaceKeyColumns(db: Database.Database): void {
  const characterColumns = db.prepare('PRAGMA table_info(characters)').all() as Array<{ name: string }>
  if (!characterColumns.some((column) => column.name === 'race_key')) {
    db.exec('ALTER TABLE characters ADD COLUMN race_key TEXT')
  }
  if (!characterColumns.some((column) => column.name === 'background_key')) {
    db.exec('ALTER TABLE characters ADD COLUMN background_key TEXT')
  }
  if (!characterColumns.some((column) => column.name === 'background_story')) {
    db.exec('ALTER TABLE characters ADD COLUMN background_story TEXT')
  }
  const npcColumns = db.prepare('PRAGMA table_info(npcs)').all() as Array<{ name: string }>
  if (!npcColumns.some((column) => column.name === 'race_key')) {
    db.exec('ALTER TABLE npcs ADD COLUMN race_key TEXT')
  }
}
