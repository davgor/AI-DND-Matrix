import { describe, expect, it } from 'vitest'
import {
  abilityModifier,
  availableStandardArrayOptions,
  createSeededRandom,
  getPointBuyRemaining,
  resolvePointBuy,
  resolveStandardArray,
  rollForStats,
  STANDARD_ARRAY,
  type Ability
} from './abilities'

describe('abilityModifier', () => {
  it.each([
    [1, -5],
    [8, -1],
    [9, -1],
    [10, 0],
    [11, 0],
    [12, 1],
    [15, 2],
    [20, 5]
  ])('maps score %i to modifier %i', (score, expected) => {
    expect(abilityModifier(score)).toBe(expected)
  })
})

describe('point buy generation', () => {
  it('accepts a valid allocation within pool and range', () => {
    const result = resolvePointBuy({ body: 14, agility: 12, mind: 10, presence: 8 })
    expect(result).toEqual({
      valid: true,
      scores: { body: 14, agility: 12, mind: 10, presence: 8 }
    })
  })

  it('allows specializing a single score up to 20 with the full pool', () => {
    const result = resolvePointBuy({ body: 20, agility: 8, mind: 8, presence: 8 })
    expect(result).toEqual({
      valid: true,
      scores: { body: 20, agility: 8, mind: 8, presence: 8 }
    })
  })

  it('rejects an allocation that exceeds the point pool', () => {
    const result = resolvePointBuy({ body: 15, agility: 15, mind: 8, presence: 8 })
    expect(result.valid).toBe(false)
  })

  it('rejects an allocation outside the min/max range', () => {
    const result = resolvePointBuy({ body: 21, agility: 8, mind: 8, presence: 8 })
    expect(result.valid).toBe(false)
  })

  it('tracks remaining points as scores are raised', () => {
    expect(getPointBuyRemaining({ body: 8, agility: 8, mind: 8, presence: 8 })).toBe(12)
    expect(getPointBuyRemaining({ body: 14, agility: 12, mind: 8, presence: 8 })).toBe(2)
    expect(getPointBuyRemaining({ body: 15, agility: 15, mind: 8, presence: 8 })).toBe(-2)
  })
})

describe('standard array generation', () => {
  it('uses the fixed 14/12/10/8 array', () => {
    expect(STANDARD_ARRAY).toEqual([14, 12, 10, 8])
  })

  it('accepts a valid full assignment of the fixed array', () => {
    const result = resolveStandardArray({ body: 14, agility: 12, mind: 10, presence: 8 })
    expect(result).toEqual({
      valid: true,
      scores: { body: 14, agility: 12, mind: 10, presence: 8 }
    })
  })

  it('rejects a duplicate assignment of the same value to two abilities', () => {
    const result = resolveStandardArray({ body: 14, agility: 14, mind: 10, presence: 8 })
    expect(result.valid).toBe(false)
  })

  it('rejects the legacy 15/14/13/12 array', () => {
    const result = resolveStandardArray({ body: 15, agility: 14, mind: 13, presence: 12 })
    expect(result.valid).toBe(false)
  })

  it('omits values already assigned to other abilities from available options', () => {
    const assignment: Record<Ability, number | ''> = {
      body: 14,
      agility: '',
      mind: '',
      presence: ''
    }
    expect(availableStandardArrayOptions(assignment, 'agility')).toEqual([12, 10, 8])
    expect(availableStandardArrayOptions(assignment, 'body')).toEqual([14, 12, 10, 8])
  })

  it('returns a used value to the pool when reassigning that ability', () => {
    const assignment: Record<Ability, number | ''> = {
      body: 14,
      agility: 12,
      mind: '',
      presence: ''
    }
    expect(availableStandardArrayOptions(assignment, 'body')).toEqual([14, 10, 8])
  })
})

describe('roll for stats generation', () => {
  it('produces the same four scores for the same seed', () => {
    const first = rollForStats(createSeededRandom(42))
    const second = rollForStats(createSeededRandom(42))
    expect(first).toEqual(second)
  })

  it('keeps every score within the 3-18 range', () => {
    const scores = rollForStats(createSeededRandom(7))
    for (const score of Object.values(scores)) {
      expect(score).toBeGreaterThanOrEqual(3)
      expect(score).toBeLessThanOrEqual(18)
    }
  })
})
