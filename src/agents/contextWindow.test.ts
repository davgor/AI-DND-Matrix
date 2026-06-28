import { describe, expect, it } from 'vitest'
import { DEFAULT_RECENCY_WINDOW, takeRecent } from './contextWindow'

describe('takeRecent', () => {
  it('returns everything when under the limit', () => {
    expect(takeRecent([1, 2, 3], 5)).toEqual([1, 2, 3])
  })

  it('caps a large seeded history to the most recent N entries', () => {
    const history = Array.from({ length: 500 }, (_, index) => index)
    const result = takeRecent(history, 20)
    expect(result).toHaveLength(20)
    expect(result[0]).toBe(480)
    expect(result[19]).toBe(499)
  })

  it('defaults to the standard recency window when no limit is given', () => {
    const history = Array.from({ length: 100 }, (_, index) => index)
    expect(takeRecent(history)).toHaveLength(DEFAULT_RECENCY_WINDOW)
  })
})
