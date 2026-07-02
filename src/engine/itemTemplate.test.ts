import { describe, expect, it } from 'vitest'
import { clampItemRarity, deriveMechanicalProperties } from './itemTemplate'

describe('clampItemRarity', () => {
  it('accepts valid rarity tiers', () => {
    expect(clampItemRarity('rare')).toBe('rare')
  })

  it('clamps unknown tiers to common', () => {
    expect(clampItemRarity('bogus')).toBe('common')
  })

  it('clamps overpowered agent tiers down to epic', () => {
    expect(clampItemRarity('legendary')).toBe('epic')
  })
})

describe('deriveMechanicalProperties', () => {
  it('derives deterministic weapon dice from type and rarity', () => {
    const first = deriveMechanicalProperties('weapon', 'common')
    const second = deriveMechanicalProperties('weapon', 'common')
    expect(first).toEqual(second)
    expect(first.kind).toBe('weapon')
    if (first.kind === 'weapon') {
      expect(first.damageRoll.diceSize).toBe(6)
    }
  })

  it('derives armor tier from rarity', () => {
    const props = deriveMechanicalProperties('armor', 'uncommon')
    expect(props).toEqual({ kind: 'armor', armorTier: 'medium' })
  })

  it('derives potion healing from rarity', () => {
    const props = deriveMechanicalProperties('potion', 'rare')
    expect(props).toEqual({ kind: 'potion', healAmount: 13 })
  })

  it('derives magic item bonuses from rarity', () => {
    const props = deriveMechanicalProperties('magicItem', 'epic')
    expect(props).toEqual({ kind: 'magicItem', acBonus: 1, attackBonus: 1, accessorySlot: 'ring1' })
  })

  it('returns misc properties for misc items', () => {
    expect(deriveMechanicalProperties('misc', 'common')).toEqual({ kind: 'misc' })
  })
})
