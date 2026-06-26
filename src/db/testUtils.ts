import Database from 'better-sqlite3'
import { runMigrations } from './migrations'
import { migrations } from './schema'

export function createTestDb(): Database.Database {
  const db = new Database(':memory:')
  runMigrations(db, migrations)
  return db
}
