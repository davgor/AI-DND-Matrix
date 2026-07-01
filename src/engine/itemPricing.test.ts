import { describe, expect, it } from 'vitest'
import { priceForItem } from './itemPricing'

describe('priceForItem', () => {
  it('scales by item type and rarity', () => {
    expect(priceForItem('weapon', 'common')).toBe(15)
    expect(priceForItem('weapon', 'uncommon')).toBe(30)
    expect(priceForItem('magicItem', 'rare')).toBe(160)
  })

  it('clamps to max price when base calculation exceeds cap', () => {
    expect(priceForItem('magicItem', 'epic')).toBe(320)
    expect(priceForItem('armor', 'epic')).toBe(200)
  })
})
