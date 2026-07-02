import { describe, expect, it } from 'vitest'
import { SPELL_SEEDS_V1 } from '../../db/catalog/seeds/spells'
import { seedStarterItemCatalog } from '../../db/seedStarterItems'
import { createTestDb } from '../../db/testUtils'
import { findCatalogItemByName } from '../../db/repositories/items'
import {
  ARCHETYPES_WITH_LOADOUT,
  getStartingLoadoutPackage,
  STARTING_LOADOUT_PACKAGES,
  STARTING_OFF_HAND_EMPTY
} from './packages'

describe('STARTING_LOADOUT_PACKAGES', () => {
  it('defines a complete package for every seed archetype', () => {
    expect(ARCHETYPES_WITH_LOADOUT).toHaveLength(5)
    for (const archetype of ARCHETYPES_WITH_LOADOUT) {
      const pkg = STARTING_LOADOUT_PACKAGES[archetype]
      expect(pkg.weapons.length).toBeGreaterThan(0)
      expect(pkg.armors.length).toBeGreaterThan(0)
    }
  })

  it('references starter catalog items and valid spell keys', () => {
    const db = createTestDb()
    seedStarterItemCatalog(db)
    const spellKeys = new Set(SPELL_SEEDS_V1.map((seed) => seed.key))

    for (const archetype of ARCHETYPES_WITH_LOADOUT) {
      const pkg = getStartingLoadoutPackage(archetype)
      for (const name of [...pkg.weapons, ...pkg.armors]) {
        expect(findCatalogItemByName(db, name), `${archetype} missing item ${name}`).toBeDefined()
      }
      for (const offHand of pkg.offHand) {
        if (offHand === STARTING_OFF_HAND_EMPTY) {
          continue
        }
        expect(findCatalogItemByName(db, offHand), `${archetype} missing off-hand ${offHand}`).toBeDefined()
      }
      for (const key of pkg.spellKeys) {
        expect(spellKeys.has(key), `${archetype} missing spell ${key}`).toBe(true)
        const seed = SPELL_SEEDS_V1.find((entry) => entry.key === key)
        expect(seed, `${archetype} spell ${key} not in seeds`).toBeDefined()
        expect((seed?.constraints.minLevel ?? 1), `${archetype} spell ${key} too high for starters`).toBe(1)
      }
    }
  })
})
