import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import {
  addItemToCharacter,
  equipCharacterItem,
  listCharacterItems,
  unequipCharacterSlot
} from './characterItems'
import { seedEquipCharacter } from './characterItemsEquipFixtures'
import { createCatalogItem } from './items'

describe('characterItems weapon swap', () => {
  it('equips, swaps, and unequips weapon slot', () => {
    const db = createTestDb()
    const character = seedEquipCharacter(db)
    const swordA = createCatalogItem(db, {
      name: 'Sword A',
      itemType: 'weapon',
      description: 'A',
      rarity: 'common',
      mechanicalProperties: {
        kind: 'weapon',
        damageRoll: { diceCount: 1, diceSize: 6, modifier: 0 },
        damageType: 'physical'
      },
      equipSlot: 'weapon',
      source: 'seed'
    })
    const swordB = createCatalogItem(db, {
      name: 'Sword B',
      itemType: 'weapon',
      description: 'B',
      rarity: 'common',
      mechanicalProperties: {
        kind: 'weapon',
        damageRoll: { diceCount: 1, diceSize: 8, modifier: 0 },
        damageType: 'physical'
      },
      equipSlot: 'weapon',
      source: 'seed'
    })
    const rowA = addItemToCharacter(db, character.id, swordA.id)
    const rowB = addItemToCharacter(db, character.id, swordB.id)

    equipCharacterItem(db, character.id, rowA.id, 'weapon')
    equipCharacterItem(db, character.id, rowB.id, 'weapon')

    const afterSwap = listCharacterItems(db, character.id)
    expect(afterSwap.find((row) => row.id === rowA.id)?.equippedSlot).toBeNull()
    expect(afterSwap.find((row) => row.id === rowB.id)?.equippedSlot).toBe('weapon')

    unequipCharacterSlot(db, character.id, 'weapon')
    expect(listCharacterItems(db, character.id).every((row) => row.equippedSlot === null)).toBe(true)
  })
})
