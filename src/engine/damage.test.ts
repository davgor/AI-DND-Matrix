import { describe, expect, it } from 'vitest'
import { applyResistance, isNaturalTwenty, resolveDamage } from './damage'

function fixedRng(value: number): () => number {
  return () => value
}

describe('critical hits', () => {
  it('detects a natural 20', () => {
    expect(isNaturalTwenty(20)).toBe(true)
    expect(isNaturalTwenty(19)).toBe(false)
  })

  it('doubles only the dice portion of damage, not the flat modifier', () => {
    const roll = { diceCount: 2, diceSize: 6, modifier: 4 }
    const rng = fixedRng(0.5) // each d6 -> floor(0.5*6)+1 = 4

    const normal = resolveDamage(roll, rng, false)
    const crit = resolveDamage(roll, rng, true)

    expect(normal).toBe(2 * 4 + 4) // 2 dice
    expect(crit).toBe(4 * 4 + 4) // 4 dice (doubled), same +4 modifier
  })
})

describe('damage types and resistance', () => {
  it('applies no modifier for physical damage with no profile entry', () => {
    expect(applyResistance(10, 'physical', {})).toBe(10)
  })

  it('halves damage for a resisted type', () => {
    expect(applyResistance(10, 'fire', { fire: 'resistant' })).toBe(5)
  })

  it('doubles damage for a vulnerable type', () => {
    expect(applyResistance(10, 'poison', { poison: 'vulnerable' })).toBe(20)
  })
})
