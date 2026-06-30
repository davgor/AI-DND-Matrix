import { describe, expect, it } from 'vitest'
import { mergeWeaponComponents, validateModification } from './modificationValidation'
import type { ItemModification, WeaponDamageProfile } from '../shared/weaponModifications/types'

const longswordProfile: WeaponDamageProfile = {
  characterItemId: 'ci-longsword',
  catalogName: 'Longsword',
  components: [{ damageRoll: { diceCount: 1, diceSize: 8, modifier: 0 }, damageType: 'physical' }]
}

const fireAddProposal = {
  targetCharacterItemId: 'ci-longsword',
  kind: 'addDamageComponent' as const,
  damageType: 'fire' as const,
  diceCount: 1,
  diceSize: 6
}

describe('validateModification caps', () => {
  it('validates 1d6 fire add on longsword', () => {
    const result = validateModification(longswordProfile, [], fireAddProposal)
    expect(result.ok).toBe(true)
  })

  it('rejects 3d12 fire add', () => {
    const result = validateModification(longswordProfile, [], {
      ...fireAddProposal,
      diceCount: 3,
      diceSize: 12
    })
    expect(result).toEqual({ ok: false, reason: 'Dice count out of range' })
  })

  it('rejects third component on same weapon', () => {
    const existing: ItemModification[] = [
      {
        id: 'm1',
        characterItemId: 'ci-longsword',
        kind: 'addDamageComponent',
        payload: { damageType: 'fire', diceCount: 1, diceSize: 6 },
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    ]
    const result = validateModification(longswordProfile, existing, fireAddProposal)
    expect(result).toEqual({ ok: false, reason: 'Weapon already has maximum damage components' })
  })
})

describe('mergeWeaponComponents', () => {
  it('appends enchantment component after base', () => {
    const mods: ItemModification[] = [
      {
        id: 'm1',
        characterItemId: 'ci-longsword',
        kind: 'addDamageComponent',
        payload: { damageType: 'fire', diceCount: 1, diceSize: 6 },
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    ]
    const merged = mergeWeaponComponents(longswordProfile.components, mods)
    expect(merged).toHaveLength(2)
    expect(merged[1]?.damageType).toBe('fire')
  })
})
