import { describe, expect, it } from 'vitest'
import { computeAC, type ArmorTier } from './armorClass'

describe('computeAC', () => {
  it.each<[ArmorTier, number]>([
    ['none', 12],
    ['light', 14],
    ['medium', 16],
    ['heavy', 18]
  ])('applies the %s armor bonus on top of 10 + agility modifier', (tier, expected) => {
    expect(computeAC(14, tier)).toBe(expected)
  })

  it('varies with agility score for a fixed tier', () => {
    expect(computeAC(8, 'light')).toBe(11)
    expect(computeAC(18, 'light')).toBe(16)
  })
})
