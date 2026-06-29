import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { addItemToCharacter, equipCharacterItem } from './characterItems'
import { seedEquipCharacter } from './characterItemsEquipFixtures'
import { createCatalogItem } from './items'

describe('characterItems equip rejection', () => {
  it('rejects invalid equip attempts', () => {
    const db = createTestDb()
    const character = seedEquipCharacter(db)
    const potion = createCatalogItem(db, {
      name: 'Tonic',
      itemType: 'potion',
      description: 'Heal',
      rarity: 'common',
      mechanicalProperties: { kind: 'potion', healAmount: 5 },
      equipSlot: null,
      source: 'seed'
    })
    const row = addItemToCharacter(db, character.id, potion.id)
    expect(equipCharacterItem(db, character.id, row.id, 'weapon')).toEqual({
      ok: false,
      reason: 'not_equippable'
    })
  })
})
