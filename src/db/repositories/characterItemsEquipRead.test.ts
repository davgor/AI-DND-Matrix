import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import {
  addItemToCharacter,
  equipCharacterItem,
  getEquippedArmorTier,
  getEquippedWeaponDamageRoll,
  unequipCharacterSlot
} from './characterItems'
import { seedEquipCharacter } from './characterItemsEquipFixtures'
import { createCatalogItem } from './items'

describe('characterItems equipped reads', () => {
  it('reads equipped armor tier and weapon damage roll', () => {
    const db = createTestDb()
    const character = seedEquipCharacter(db)
    const armor = createCatalogItem(db, {
      name: 'Chain',
      itemType: 'armor',
      description: 'Medium',
      rarity: 'uncommon',
      mechanicalProperties: { kind: 'armor', armorTier: 'medium' },
      equipSlot: 'armor',
      source: 'seed'
    })
    const weapon = createCatalogItem(db, {
      name: 'Axe',
      itemType: 'weapon',
      description: 'Heavy',
      rarity: 'rare',
      mechanicalProperties: {
        kind: 'weapon',
        damageRoll: { diceCount: 1, diceSize: 12, modifier: 1 },
        damageType: 'physical'
      },
      equipSlot: 'weapon',
      source: 'seed'
    })
    const armorRow = addItemToCharacter(db, character.id, armor.id)
    const weaponRow = addItemToCharacter(db, character.id, weapon.id)
    equipCharacterItem(db, character.id, armorRow.id, 'armor')
    equipCharacterItem(db, character.id, weaponRow.id, 'weapon')

    expect(getEquippedArmorTier(db, character.id)).toBe('medium')
    expect(getEquippedWeaponDamageRoll(db, character.id)).toEqual({
      diceCount: 1,
      diceSize: 12,
      modifier: 1
    })

    unequipCharacterSlot(db, character.id, 'armor')
    expect(getEquippedArmorTier(db, character.id)).toBe('none')
  })
})
