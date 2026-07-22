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

describe('resolveSave conditions', () => {
  it('stunned auto-fails body saves without rolling high', () => {
    const result = resolveSave({
      ability: 'body',
      rng: rngForRoll(20),
      abilityScore: 20,
      proficient: true,
      proficiencyBonus: 6,
      dc: 5,
      conditions: ['stunned']
    })
    expect(result.success).toBe(false)
    expect(result.roll).toBe(1)
  })

  it('unconscious auto-fails agility saves', () => {
    const result = resolveSave({
      ability: 'agility',
      rng: rngForRoll(20),
      abilityScore: 18,
      proficient: false,
      proficiencyBonus: 0,
      dc: 5,
      conditions: ['unconscious']
    })
    expect(result.success).toBe(false)
  })

  it('poisoned applies disadvantage on mind saves', () => {
    let calls = 0
    const rng = () => {
      calls += 1
      return calls === 1 ? (18 - 1) / 20 : (3 - 1) / 20
    }
    const result = resolveSave({
      ability: 'mind',
      rng,
      abilityScore: 10,
      proficient: false,
      proficiencyBonus: 0,
      dc: 10,
      conditions: ['poisoned']
    })
    expect(result.roll).toBe(3)
    expect(result.success).toBe(false)
  })
})
