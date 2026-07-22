import { describe, expect, it } from 'vitest'
import { priceForItem } from '../itemPricing'
import { sellPriceForItem } from './sellPrice'

describe('sellPriceForItem', () => {
  it('credits half the engine buy price (floored, min 1)', () => {
    const buy = priceForItem('weapon', 'common')
    expect(sellPriceForItem('weapon', 'common')).toBe(Math.max(1, Math.floor(buy / 2)))
    expect(sellPriceForItem('misc', 'common')).toBeGreaterThanOrEqual(1)
  })
})
