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

function validateFighterLoadout(
  weaponName: string,
  offHandChoice: string,
  spellKeys: string[] = ['rallying-strike']
) {
  return validateStartingLoadout(
    'fighter',
    {
      weaponName,
      armorName: 'Chain Hauberk',
      offHandChoice,
      spellKeys
    },
    weapon(weaponName),
    meta
  )
}

describe('validateStartingLoadout fighter — valid loadouts', () => {
  it('accepts a valid loadout', () => {
    const result = validateFighterLoadout('Longsword', 'Wooden Shield')
    expect(result.ok).toBe(true)
  })

  it('accepts greatsword with empty off-hand', () => {
    const result = validateFighterLoadout('Greatsword', STARTING_OFF_HAND_EMPTY)
    expect(result.ok).toBe(true)
  })
})

describe('validateStartingLoadout fighter — off-hand conflicts', () => {
  it('rejects greataxe with shield off-hand', () => {
    const result = validateFighterLoadout('Greataxe', 'Wooden Shield')
    expect(result).toEqual({ ok: false, reason: 'two_hand_blocks_off_hand' })
  })

  it('rejects greatsword with shield off-hand', () => {
    const result = validateFighterLoadout('Greatsword', 'Wooden Shield')
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
