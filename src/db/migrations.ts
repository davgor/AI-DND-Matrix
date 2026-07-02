import type Database from 'better-sqlite3'

export interface Migration {
  version: number
  up: (db: Database.Database) => void
  /** When true, runs outside a SQLite transaction (needed for FK-off table rebuilds). */
  disableTransaction?: boolean
}

export function runMigrations(db: Database.Database, migrations: Migration[]): void {
  const currentVersion = db.pragma('user_version', { simple: true }) as number

  const pending = migrations
    .filter((migration) => migration.version > currentVersion)
    .sort((a, b) => a.version - b.version)

  for (const migration of pending) {
    const apply = (): void => {
      migration.up(db)
      db.pragma(`user_version = ${migration.version}`)
    }
    if (migration.disableTransaction) {
      apply()
    } else {
      db.transaction(apply)()
    }
  }
}
