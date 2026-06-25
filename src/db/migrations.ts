import type Database from 'better-sqlite3'

export interface Migration {
  version: number
  up: (db: Database.Database) => void
}

export function runMigrations(db: Database.Database, migrations: Migration[]): void {
  const currentVersion = db.pragma('user_version', { simple: true }) as number

  const pending = migrations
    .filter((migration) => migration.version > currentVersion)
    .sort((a, b) => a.version - b.version)

  for (const migration of pending) {
    db.transaction(() => {
      migration.up(db)
      db.pragma(`user_version = ${migration.version}`)
    })()
  }
}
