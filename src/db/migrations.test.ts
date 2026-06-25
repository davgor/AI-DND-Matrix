import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { runMigrations, type Migration } from './migrations'

function tableNames(db: Database.Database): string[] {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => (row as { name: string }).name)
}

function appliedVersion(db: Database.Database): number {
  return db.pragma('user_version', { simple: true }) as number
}

const testMigrations: Migration[] = [
  { version: 1, up: (db) => db.exec('CREATE TABLE foo (id INTEGER PRIMARY KEY)') },
  { version: 2, up: (db) => db.exec('CREATE TABLE bar (id INTEGER PRIMARY KEY)') },
  { version: 3, up: (db) => db.exec('CREATE TABLE baz (id INTEGER PRIMARY KEY)') }
]

describe('runMigrations', () => {
  it('applies numbered migrations in order against a fresh database', () => {
    const db = new Database(':memory:')

    runMigrations(db, testMigrations)

    expect(tableNames(db)).toEqual(['bar', 'baz', 'foo'])
    expect(appliedVersion(db)).toBe(3)
  })

  it('is idempotent when run twice against the same database', () => {
    const db = new Database(':memory:')

    runMigrations(db, testMigrations)
    expect(() => runMigrations(db, testMigrations)).not.toThrow()

    expect(tableNames(db)).toEqual(['bar', 'baz', 'foo'])
    expect(appliedVersion(db)).toBe(3)
  })

  it('applies only pending migrations when some are already applied', () => {
    const db = new Database(':memory:')

    runMigrations(db, testMigrations.slice(0, 1))
    expect(appliedVersion(db)).toBe(1)

    runMigrations(db, testMigrations)

    expect(tableNames(db)).toEqual(['bar', 'baz', 'foo'])
    expect(appliedVersion(db)).toBe(3)
  })
})

describe('runMigrations against a real on-disk file across separate opens', () => {
  let dir: string

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  it('creates a fresh DB file and applies migrations to it', () => {
    dir = mkdtempSync(join(tmpdir(), 'migrations-test-'))
    const filePath = join(dir, 'test.sqlite')
    expect(existsSync(filePath)).toBe(false)

    const db = new Database(filePath)
    runMigrations(db, testMigrations)
    expect(tableNames(db)).toEqual(['bar', 'baz', 'foo'])
    db.close()

    expect(existsSync(filePath)).toBe(true)
  })

  it('applies only pending migrations when reopening a file missing later migrations', () => {
    dir = mkdtempSync(join(tmpdir(), 'migrations-test-'))
    const filePath = join(dir, 'test.sqlite')

    const firstOpen = new Database(filePath)
    runMigrations(firstOpen, testMigrations.slice(0, 1))
    firstOpen.prepare('INSERT INTO foo (id) VALUES (1)').run()
    firstOpen.close()

    const secondOpen = new Database(filePath)
    runMigrations(secondOpen, testMigrations)

    expect(tableNames(secondOpen)).toEqual(['bar', 'baz', 'foo'])
    expect(appliedVersion(secondOpen)).toBe(3)
    expect(secondOpen.prepare('SELECT id FROM foo').all()).toEqual([{ id: 1 }])
    secondOpen.close()
  })
})
