import { describe, expect, it } from 'vitest'
import type { Ability } from './abilities'
import { resolveSave } from './saves'

function rngForRoll(d20Roll: number): () => number {
  return () => (d20Roll - 1) / 20
}

describe('resolveSave', () => {
  const abilities: Ability[] = ['body', 'agility', 'mind', 'presence']

  it.each(abilities)('resolves a passing %s save', (ability) => {
    const result = resolveSave({
      ability,
      rng: rngForRoll(15),
      abilityScore: 10,
      proficient: false,
      proficiencyBonus: 0,
      dc: 10
    })
    expect(result.success).toBe(true)
  })

  it.each(abilities)('resolves a failing %s save', (ability) => {
    const result = resolveSave({
      ability,
      rng: rngForRoll(2),
      abilityScore: 10,
      proficient: false,
      proficiencyBonus: 0,
      dc: 10
    })
    expect(result.success).toBe(false)
  })
})
