import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { closeFileTestDb, openFileTestDb, reopenFileTestDb } from './fileDbTestUtils'

describe('fileDbTestUtils (Windows-safe on-disk SQLite helpers)', () => {
  let dir: string | undefined

  afterEach(() => {
    if (dir) {
      rmSync(dir, { recursive: true, force: true })
      dir = undefined
    }
  })

  it('reopens a closed file database and reads back written state', () => {
    dir = mkdtempSync(join(tmpdir(), 'file-db-utils-'))
    const db = openFileTestDb(join(dir, 'save.sqlite'))
    db.pragma('user_version = 42')
    const reopened = reopenFileTestDb(db)
    expect(reopened.pragma('user_version', { simple: true })).toBe(42)
    expect(reopened.pragma('journal_mode', { simple: true })).toBe('delete')
    closeFileTestDb(reopened)
  })

  it('closeFileTestDb is a no-op on an already-closed connection', () => {
    dir = mkdtempSync(join(tmpdir(), 'file-db-utils-closed-'))
    const db = openFileTestDb(join(dir, 'save.sqlite'))
    db.close()
    expect(() => closeFileTestDb(db)).not.toThrow()
    expect(() => closeFileTestDb(undefined)).not.toThrow()
  })
})
