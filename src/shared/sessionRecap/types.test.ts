import { describe, expect, it } from 'vitest'
import {
  SESSION_RECAP_EMPTY_COPY,
  SESSION_RECAP_HUB_SECTION_TITLE,
  isPersistedSessionRecap,
  needsSessionRecapRegeneration,
  parsePersistedSessionRecap,
  type PersistedSessionRecap
} from './types'

describe('SESSION_RECAP constants', () => {
  it('matches the start-of-story empty-events message (no LLM)', () => {
    expect(SESSION_RECAP_EMPTY_COPY).toContain('start of your story')
    expect(SESSION_RECAP_EMPTY_COPY.toLowerCase()).toContain('nothing has happened')
  })

  it('locks the hub section title that replaces Recent events', () => {
    expect(SESSION_RECAP_HUB_SECTION_TITLE).toBe('Session recap')
  })
})

describe('needsSessionRecapRegeneration — missing store', () => {
  it('returns true when no persisted recap exists', () => {
    expect(
      needsSessionRecapRegeneration({
        stored: null,
        lastPlayedAt: null
      })
    ).toBe(true)
    expect(
      needsSessionRecapRegeneration({
        stored: null,
        lastPlayedAt: '2026-07-20T12:00:00.000Z'
      })
    ).toBe(true)
  })
})

describe('needsSessionRecapRegeneration — fresh store', () => {
  const stored: PersistedSessionRecap = {
    text: 'Previously, you left the tavern.',
    generatedAt: '2026-07-20T12:00:00.000Z'
  }

  it('returns false when lastPlayedAt is at or before generatedAt', () => {
    expect(needsSessionRecapRegeneration({ stored, lastPlayedAt: '2026-07-20T11:00:00.000Z' })).toBe(
      false
    )
    expect(needsSessionRecapRegeneration({ stored, lastPlayedAt: '2026-07-20T12:00:00.000Z' })).toBe(
      false
    )
  })

  it('returns false when a recap exists but lastPlayedAt is null', () => {
    expect(needsSessionRecapRegeneration({ stored, lastPlayedAt: null })).toBe(false)
  })
})

describe('needsSessionRecapRegeneration — stale store', () => {
  it('returns true when lastPlayedAt is strictly after generatedAt', () => {
    expect(
      needsSessionRecapRegeneration({
        stored: {
          text: 'Previously, you left the tavern.',
          generatedAt: '2026-07-20T12:00:00.000Z'
        },
        lastPlayedAt: '2026-07-20T13:00:00.000Z'
      })
    ).toBe(true)
  })
})

describe('persisted session recap guards', () => {
  const valid: PersistedSessionRecap = {
    text: 'Previously on…',
    generatedAt: '2026-07-20T12:00:00.000Z'
  }

  it('accepts a well-formed persisted recap', () => {
    expect(isPersistedSessionRecap(valid)).toBe(true)
    expect(parsePersistedSessionRecap(valid)).toEqual(valid)
  })

  it('rejects malformed shapes', () => {
    expect(isPersistedSessionRecap({ text: 1, generatedAt: 'x' })).toBe(false)
    expect(isPersistedSessionRecap({ text: 'ok' })).toBe(false)
    expect(parsePersistedSessionRecap(null)).toBeUndefined()
  })
})
