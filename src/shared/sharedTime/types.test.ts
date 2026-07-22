import { describe, expect, it } from 'vitest'
import {
  SHARED_TIME_MODEL,
  SHARED_TIME_HUB_CLOCK_LABEL,
  SHARED_TIME_NON_GOALS,
  buildAwayDigest,
  computeAwayDays,
  formatAwayBlurb,
  formatLastActiveLabel,
  formatWorldDayLabel,
  isAwayFromClock
} from './types'

describe('sharedTime model lock (133.1)', () => {
  it('locks Model B — shared campaign clock + per-PC watermark', () => {
    expect(SHARED_TIME_MODEL).toBe('B')
  })

  it('names parallel calendars as a non-goal', () => {
    expect(SHARED_TIME_NON_GOALS.join(' ').toLowerCase()).toContain('parallel calendar')
  })

  it('locks player-facing hub clock label without implying private timelines', () => {
    expect(SHARED_TIME_HUB_CLOCK_LABEL.toLowerCase()).toContain('world day')
    expect(SHARED_TIME_HUB_CLOCK_LABEL.toLowerCase()).not.toContain('your calendar')
  })
})

describe('computeAwayDays / isAwayFromClock', () => {
  it('returns 0 when watermark matches or leads the clock (legacy / synced)', () => {
    expect(computeAwayDays(12, 12)).toBe(0)
    expect(computeAwayDays(10, 12)).toBe(0)
    expect(isAwayFromClock(12, 12)).toBe(false)
  })

  it('returns positive gap when the shared clock advanced past last-active', () => {
    expect(computeAwayDays(15, 12)).toBe(3)
    expect(isAwayFromClock(15, 12)).toBe(true)
  })
})

describe('buildAwayDigest — deterministic copy (no LLM)', () => {
  it('returns null when the PC is not away from the shared clock', () => {
    expect(
      buildAwayDigest({
        worldDay: 12,
        lastActiveInGameDate: 12,
        eventHeadlines: ['Alice rested.']
      })
    ).toBeNull()
  })

  it('summarizes away days and caps event headlines', () => {
    const digest = buildAwayDigest({
      worldDay: 15,
      lastActiveInGameDate: 12,
      eventHeadlines: ['Alice rested.', 'Travel to Greywatch.', 'Extra line.', 'Fourth.']
    })
    expect(digest).not.toBeNull()
    expect(digest!.awayDays).toBe(3)
    expect(digest!.worldDay).toBe(15)
    expect(digest!.lastActiveInGameDate).toBe(12)
    expect(digest!.summary).toContain('3')
    expect(digest!.summary.toLowerCase()).toContain('shared')
    expect(digest!.eventHeadlines).toHaveLength(3)
  })
})

describe('hub / cast copy helpers', () => {
  it('formats world day and last-active labels for Model B', () => {
    expect(formatWorldDayLabel(12)).toBe('World day 12')
    expect(formatLastActiveLabel(9)).toBe('Last active: day 9')
  })

  it('formats away blurb only when lagged; empty when synced', () => {
    expect(formatAwayBlurb(15, 12)).toContain('3')
    expect(formatAwayBlurb(12, 12)).toBe('')
  })
})
