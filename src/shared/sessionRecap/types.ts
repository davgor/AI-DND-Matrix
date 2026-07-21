/**
 * Campaign-scoped session recap persisted for hub boot (and optional play-view reuse).
 * Shape is the minimum contract for DB / IPC / UI — epic 124.
 */
export interface PersistedSessionRecap {
  text: string
  /** ISO-8601 timestamp when this text was written. */
  generatedAt: string
}

/** IPC / hub result: persisted fields plus whether generation was skipped. */
export interface SessionRecapResult extends PersistedSessionRecap {
  fromCache: boolean
}

/** Inputs for the hub freshness gate vs sessions.last_played_at. */
export interface SessionRecapFreshnessInput {
  stored: PersistedSessionRecap | null
  lastPlayedAt: string | null
}

/**
 * Empty-events / never-played copy — must not trigger an LLM call.
 * Kept identical to the historical generateSessionRecap empty path.
 */
export const SESSION_RECAP_EMPTY_COPY =
  'This is the start of your story — nothing has happened yet.'

/** Hub world-preview section title (replaces "Recent events"). */
export const SESSION_RECAP_HUB_SECTION_TITLE = 'Session recap'

/**
 * Freshness gate (124):
 * - no stored recap → generate
 * - lastPlayedAt > generatedAt → regenerate
 * - otherwise return stored text (no LLM)
 */
export function needsSessionRecapRegeneration(input: SessionRecapFreshnessInput): boolean {
  if (input.stored === null) {
    return true
  }
  if (input.lastPlayedAt === null) {
    return false
  }
  return input.lastPlayedAt > input.stored.generatedAt
}

export function isPersistedSessionRecap(value: unknown): value is PersistedSessionRecap {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const row = value as Record<string, unknown>
  return typeof row['text'] === 'string' && typeof row['generatedAt'] === 'string'
}

export function parsePersistedSessionRecap(value: unknown): PersistedSessionRecap | undefined {
  return isPersistedSessionRecap(value) ? value : undefined
}
