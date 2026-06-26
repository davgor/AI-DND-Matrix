import { describe, expect, it } from 'vitest'
import { computeHP } from './hp'

describe('computeHP', () => {
  it('accumulates fighter (d10) HP deterministically across levels', () => {
    expect(computeHP('fighter', 1, 14)).toBe(8)
    expect(computeHP('fighter', 3, 14)).toBe(24)
    expect(computeHP('fighter', 5, 14)).toBe(40)
  })

  it('accumulates mage (d6) HP deterministically across levels', () => {
    expect(computeHP('mage', 1, 10)).toBe(4)
    expect(computeHP('mage', 3, 10)).toBe(12)
    expect(computeHP('mage', 5, 10)).toBe(20)
  })

  it('never uses randomness — repeated calls return identical results', () => {
    expect(computeHP('rogue', 4, 12)).toBe(computeHP('rogue', 4, 12))
  })
})
