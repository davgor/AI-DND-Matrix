import { describe, expect, it } from 'vitest'
import { resolveWeaponDamage, resolveWeaponDamageAgainstProfile } from './weaponDamage'
import type { DamageComponent } from '../shared/weaponModifications/types'

const physicalFire: DamageComponent[] = [
  { damageRoll: { diceCount: 1, diceSize: 8, modifier: 0 }, damageType: 'physical' },
  { damageRoll: { diceCount: 1, diceSize: 6, modifier: 0 }, damageType: 'fire' }
]

function maxRng(): () => number {
  return () => 0.99
}

describe('resolveWeaponDamage', () => {
  it('returns two line items and correct sum for 1d8 physical + 1d6 fire', () => {
    const breakdown = resolveWeaponDamage(physicalFire, maxRng(), false)
    expect(breakdown.components).toHaveLength(2)
    expect(breakdown.components[0]).toEqual({ type: 'physical', rolled: 8, afterResistance: 8 })
    expect(breakdown.components[1]).toEqual({ type: 'fire', rolled: 6, afterResistance: 6 })
    expect(breakdown.total).toBe(14)
  })

  it('doubles dice on both components when critical', () => {
    const breakdown = resolveWeaponDamage(physicalFire, maxRng(), true)
    expect(breakdown.components[0]?.rolled).toBe(16)
    expect(breakdown.components[1]?.rolled).toBe(12)
    expect(breakdown.total).toBe(28)
  })
})

describe('resolveWeaponDamageAgainstProfile', () => {
  it('halves only the fire component when target resists fire', () => {
    const breakdown = resolveWeaponDamageAgainstProfile(physicalFire, maxRng(), false, {
      fire: 'resistant'
    })
    expect(breakdown.components[0]?.afterResistance).toBe(8)
    expect(breakdown.components[1]?.afterResistance).toBe(3)
    expect(breakdown.total).toBe(11)
  })
})
