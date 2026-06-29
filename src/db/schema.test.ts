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
  'catalog_bucket_tags',
  'catalog_creatures',
  'catalog_spells',
  'character_items',
  'character_journal_entries',
  'characters',
  'events',
  'guided_creation_messages',
  'items',
  'log_entries',
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

  it('migration 17 adds alignment and temperament columns', () => {
    const db = new Database(':memory:')
    runMigrations(
      db,
      migrations.filter((migration) => migration.version <= 16)
    )

    runMigrations(
      db,
      migrations.filter((migration) => migration.version === 17)
    )

    const characterColumns = db
      .prepare("PRAGMA table_info(characters)")
      .all()
      .map((row) => (row as { name: string }).name)
    expect(characterColumns).toContain('alignment')
    expect(characterColumns).toContain('pending_alignment_shift')

    const npcColumns = db
      .prepare("PRAGMA table_info(npcs)")
      .all()
      .map((row) => (row as { name: string }).name)
    expect(npcColumns).toContain('alignment')
    expect(npcColumns).toContain('temperament')
    expect(npcColumns).toContain('can_speak')

    const creatureColumns = db
      .prepare("PRAGMA table_info(catalog_creatures)")
      .all()
      .map((row) => (row as { name: string }).name)
    expect(creatureColumns).toContain('temperament')
    expect(creatureColumns).toContain('can_speak')
  })
})
