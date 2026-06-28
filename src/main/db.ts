import { app } from 'electron'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { runMigrations } from '../db/migrations'
import { migrations } from '../db/schema'

let dbInstance: Database.Database | undefined

export function getDb(): Database.Database {
  if (!dbInstance) {
    const dbPath = join(app.getPath('userData'), 'campaign.sqlite')
    dbInstance = new Database(dbPath)
    runMigrations(dbInstance, migrations)
  }
  return dbInstance
}
