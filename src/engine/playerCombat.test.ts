import { describe, expect, it } from 'vitest'
import { computeAC } from './armorClass'
import { UNARMED_DAMAGE_ROLL } from './itemTemplate'
import { resolvePlayerAttackDamage } from './playerCombat'
import type { DamageRoll } from './damage'

describe('resolvePlayerAttackDamage', () => {
  const rng = (): number => 0.99

  it('uses equipped weapon damage dice', () => {
    const equipped: DamageRoll = { diceCount: 1, diceSize: 12, modifier: 0 }
    expect(resolvePlayerAttackDamage(equipped, rng, 15)).toBe(12)
  })

  it('falls back to unarmed damage when no weapon is equipped', () => {
    expect(resolvePlayerAttackDamage(UNARMED_DAMAGE_ROLL, rng, 15)).toBe(4)
  })

  it('doubles dice on a natural 20', () => {
    const equipped: DamageRoll = { diceCount: 1, diceSize: 8, modifier: 0 }
    expect(resolvePlayerAttackDamage(equipped, rng, 20)).toBe(16)
  })
})

describe('equipped armor affects AC', () => {
  it('raises AC for medium armor and returns to unarmored after unequipping', () => {
    const unarmored = computeAC(14, 'none')
    const armored = computeAC(14, 'medium')
    expect(armored).toBeGreaterThan(unarmored)
    expect(computeAC(14, 'none')).toBe(unarmored)
  })
})
