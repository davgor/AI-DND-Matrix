import Database from 'better-sqlite3'

/**
 * On-disk SQLite helpers for persistence smoke tests.
 *
 * Windows CI flakes when a file DB is closed and immediately reopened: WAL
 * sidecars / delayed handle release can leave `new Database(path)` blocked
 * until vitest's testTimeout fires. DELETE journal mode avoids WAL files, and
 * reopen retries briefly instead of hanging on a single long busy wait.
 */

const OPEN_BUSY_TIMEOUT_MS = 1_000
const REOPEN_RETRY_WINDOW_MS = 5_000
const REOPEN_RETRY_DELAY_MS = 25

function sleepSync(ms: number): void {
  const end = Date.now() + ms
  while (Date.now() < end) {
    // Spin — better-sqlite3 is sync; avoid pulling in async timers in helpers.
  }
}

/** Open a file-backed DB with settings that release cleanly on Windows. */
export function openFileTestDb(filePath: string): Database.Database {
  const db = new Database(filePath, { timeout: OPEN_BUSY_TIMEOUT_MS })
  db.pragma('journal_mode = DELETE')
  return db
}

/** Close `db` and reopen the same file path, retrying through brief lock windows. */
export function reopenFileTestDb(db: Database.Database): Database.Database {
  const filePath = db.name
  db.close()
  const deadline = Date.now() + REOPEN_RETRY_WINDOW_MS
  let lastError: unknown
  while (Date.now() < deadline) {
    try {
      return openFileTestDb(filePath)
    } catch (error) {
      lastError = error
      sleepSync(REOPEN_RETRY_DELAY_MS)
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to reopen SQLite file: ${String(lastError)}`)
}

/** Close if still open — safe for afterEach when the test already closed. */
export function closeFileTestDb(db: Database.Database | undefined): void {
  if (db?.open) {
    db.close()
  }
}
