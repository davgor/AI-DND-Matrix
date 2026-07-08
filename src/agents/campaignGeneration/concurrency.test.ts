import { describe, expect, it } from 'vitest'
import { mapWithConcurrency } from './concurrency'

describe('mapWithConcurrency', () => {
  it('returns results in input order even when tasks finish out of order', async () => {
    const delays = [12, 0, 6]
    const results = await mapWithConcurrency(delays, 3, async (delay, index) => {
      await new Promise((resolve) => setTimeout(resolve, delay))
      return index
    })
    expect(results).toEqual([0, 1, 2])
  })

  it('overlaps tasks without exceeding the concurrency limit', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const items = Array.from({ length: 9 }, (_, index) => index)
    const results = await mapWithConcurrency(items, 3, async (item) => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await Promise.resolve()
      inFlight -= 1
      return item * 2
    })
    expect(maxInFlight).toBe(3)
    expect(results).toEqual(items.map((item) => item * 2))
  })

  it('runs fewer workers than the limit when items are scarce', async () => {
    let started = 0
    const results = await mapWithConcurrency([1, 2], 4, async (item) => {
      started += 1
      return item
    })
    expect(started).toBe(2)
    expect(results).toEqual([1, 2])
  })

  it('resolves to an empty array for an empty item list', async () => {
    const results = await mapWithConcurrency([], 4, async (item: number) => item)
    expect(results).toEqual([])
  })

  it('propagates a task rejection to the caller', async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (item) => {
        if (item === 2) {
          throw new Error('boom')
        }
        return item
      })
    ).rejects.toThrow('boom')
  })
})
