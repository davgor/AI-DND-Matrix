import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { runMigrations } from './migrations'
import { migrations } from './schema'

function tableNames(db: Database.Database): string[] {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => (row as { name: string }).name)
}

const ALL_TABLE_NAMES = [
  'campaigns',
  'characters',
  'events',
  'npc_memories',
  'npcs',
  'region_history',
  'regions',
  'saves',
  'sessions',
  'story_threads',
  'world_facts'
]

describe('the real app migrations registry', () => {
  it('applies cleanly to a fresh database and creates every expected table', () => {
    const db = new Database(':memory:')
    runMigrations(db, migrations)
    expect(tableNames(db)).toEqual(ALL_TABLE_NAMES)
  })

  it('is idempotent when run twice', () => {
    const db = new Database(':memory:')
    runMigrations(db, migrations)
    expect(() => runMigrations(db, migrations)).not.toThrow()
    expect(tableNames(db)).toEqual(ALL_TABLE_NAMES)
  })

  it('applies only pending migrations when reopened partway through the registry', () => {
    const db = new Database(':memory:')

    runMigrations(db, migrations.slice(0, 1))
    expect(tableNames(db)).toEqual(['campaigns'])

    runMigrations(db, migrations)
    expect(tableNames(db)).toEqual(ALL_TABLE_NAMES)
  })
})
