import { describe, expect, it } from 'vitest'
import { seedStarterItemCatalog } from '../../db/seedStarterItems'
import { createTestDb } from '../../db/testUtils'
import { findCatalogItemByName } from '../../db/repositories/items'
import { STARTING_OFF_HAND_EMPTY } from './packages'
import { validateStartingLoadout } from './validate'
import { SPELL_SEEDS_V1 } from '../../db/catalog/seeds/spells'

const meta = SPELL_SEEDS_V1.map((seed) => ({
  key: seed.key,
  requiresArchetype: seed.constraints.requiresArchetype,
  minLevel: seed.constraints.minLevel
}))

function weapon(name: string) {
  const db = createTestDb()
  seedStarterItemCatalog(db)
  return findCatalogItemByName(db, name)!
}

describe('validateStartingLoadout fighter', () => {
  it('accepts a valid loadout', () => {
    const result = validateStartingLoadout(
      'fighter',
      {
        weaponName: 'Longsword',
        armorName: 'Chain Hauberk',
        offHandChoice: 'Wooden Shield',
        spellKeys: ['rallying-strike']
      },
      weapon('Longsword'),
      meta
    )
    expect(result.ok).toBe(true)
  })

  it('rejects greataxe with shield off-hand', () => {
    const result = validateStartingLoadout(
      'fighter',
      {
        weaponName: 'Greataxe',
        armorName: 'Chain Hauberk',
        offHandChoice: 'Wooden Shield',
        spellKeys: ['rallying-strike']
      },
      weapon('Greataxe'),
      meta
    )
    expect(result).toEqual({ ok: false, reason: 'two_hand_blocks_off_hand' })
  })
})

describe('validateStartingLoadout mage', () => {
  it('rejects cross-archetype weapons', () => {
    const result = validateStartingLoadout(
      'mage',
      {
        weaponName: 'Greataxe',
        armorName: "Traveler's Leathers",
        offHandChoice: STARTING_OFF_HAND_EMPTY,
        spellKeys: ['firebolt', 'arcane-bolt']
      },
      weapon('Greataxe'),
      meta
    )
    expect(result).toEqual({ ok: false, reason: 'invalid_weapon' })
  })

  it('rejects wrong spell count', () => {
    const result = validateStartingLoadout(
      'mage',
      {
        weaponName: 'Dagger',
        armorName: "Traveler's Leathers",
        offHandChoice: STARTING_OFF_HAND_EMPTY,
        spellKeys: ['firebolt']
      },
      weapon('Dagger'),
      meta
    )
    expect(result).toEqual({ ok: false, reason: 'invalid_spell_count' })
  })
})
