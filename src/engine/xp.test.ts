import { describe, expect, it } from 'vitest'
import { awardXP } from './xp'

describe('awardXP', () => {
  it('does not level up just below a threshold', () => {
    const result = awardXP({ xp: 0, level: 1 }, 299)
    expect(result).toEqual({ state: { xp: 299, level: 1 }, leveledUp: false })
  })

  it('levels up exactly at a threshold', () => {
    const result = awardXP({ xp: 0, level: 1 }, 300)
    expect(result).toEqual({ state: { xp: 300, level: 2 }, leveledUp: true })
  })

  it('jumps directly to the highest level crossed by a large award, not just +1', () => {
    const result = awardXP({ xp: 0, level: 1 }, 6500)
    expect(result.state.level).toBe(5)
    expect(result.leveledUp).toBe(true)
  })
})
