import { describe, expect, it } from 'vitest'
import { resolveCheck } from './checks'

function fixedSequence(values: number[]): () => number {
  let index = 0
  return () => values[index++ % values.length]
}

function rngForRoll(d20Roll: number): () => number {
  return fixedSequence([(d20Roll - 1) / 20])
}

describe('resolveCheck pass/fail and proficiency', () => {
  it('passes when total exactly equals the DC', () => {
    const result = resolveCheck({
      rng: rngForRoll(10),
      abilityScore: 10,
      proficient: false,
      proficiencyBonus: 0,
      dc: 10
    })
    expect(result).toEqual({ roll: 10, total: 10, success: true })
  })

  it('fails when total is one below the DC', () => {
    const result = resolveCheck({
      rng: rngForRoll(9),
      abilityScore: 10,
      proficient: false,
      proficiencyBonus: 0,
      dc: 10
    })
    expect(result.success).toBe(false)
  })

  it('adds the proficiency bonus only when proficient', () => {
    const proficient = resolveCheck({
      rng: rngForRoll(10),
      abilityScore: 10,
      proficient: true,
      proficiencyBonus: 3,
      dc: 10
    })
    const notProficient = resolveCheck({
      rng: rngForRoll(10),
      abilityScore: 10,
      proficient: false,
      proficiencyBonus: 3,
      dc: 10
    })
    expect(proficient.total).toBe(13)
    expect(notProficient.total).toBe(10)
  })
})

describe('resolveCheck advantage and disadvantage', () => {
  it('takes the higher of two d20 rolls with advantage', () => {
    const rng = fixedSequence([(5 - 1) / 20, (18 - 1) / 20])
    const result = resolveCheck({
      rng,
      abilityScore: 10,
      proficient: false,
      proficiencyBonus: 0,
      dc: 1,
      mode: 'advantage'
    })
    expect(result.roll).toBe(18)
  })

  it('takes the lower of two d20 rolls with disadvantage', () => {
    const rng = fixedSequence([(5 - 1) / 20, (18 - 1) / 20])
    const result = resolveCheck({
      rng,
      abilityScore: 10,
      proficient: false,
      proficiencyBonus: 0,
      dc: 1,
      mode: 'disadvantage'
    })
    expect(result.roll).toBe(5)
  })
})
