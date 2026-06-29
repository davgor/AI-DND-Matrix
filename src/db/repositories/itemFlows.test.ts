import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createCharacter } from './characters'
import { addItemToCharacter, equipCharacterItem, listCharacterItems } from './characterItems'
import { consumePotion, grantItemToCharacter, purchaseItemForCharacter, removeOwnedItem } from './itemFlows'
import { createCatalogItem } from './items'

function seedPlayer(db: ReturnType<typeof createTestDb>, currency = 50) {
  const campaign = createCampaign(db, {
    name: 'Shop',
    premisePrompt: 'test',
    deathMode: 'legendary'
  })
  return createCharacter(db, {
    campaignId: campaign.id,
    name: 'Buyer',
    characterClass: 'fighter',
    kind: 'player',
    currency,
    hp: 10
  })
}

describe('itemFlows grant and purchase', () => {
  it('grants catalog items to a character', () => {
    const db = createTestDb()
    const character = seedPlayer(db)
    const item = createCatalogItem(db, {
      name: 'Loot Coin',
      itemType: 'misc',
      description: 'Shiny',
      rarity: 'common',
      mechanicalProperties: { kind: 'misc' },
      equipSlot: null,
      source: 'seed'
    })
    expect(grantItemToCharacter(db, character.id, item.id)).toEqual({ ok: true })
    expect(listCharacterItems(db, character.id)[0]?.quantity).toBe(1)
  })

  it('blocks purchases when funds are insufficient', () => {
    const db = createTestDb()
    const character = seedPlayer(db, 5)
    const item = createCatalogItem(db, {
      name: 'Expensive Blade',
      itemType: 'weapon',
      description: 'Costly',
      rarity: 'rare',
      mechanicalProperties: {
        kind: 'weapon',
        damageRoll: { diceCount: 1, diceSize: 8, modifier: 0 },
        damageType: 'physical'
      },
      equipSlot: 'weapon',
      source: 'seed'
    })
    expect(purchaseItemForCharacter(db, character.id, item.id, 20)).toEqual({
      ok: false,
      reason: 'insufficient_funds'
    })
    expect(purchaseItemForCharacter(db, character.id, item.id, 5)).toEqual({
      ok: true,
      newBalance: 0
    })
  })
})

describe('itemFlows consume and remove', () => {
  it('consumes a potion and heals the character', () => {
    const db = createTestDb()
    const character = seedPlayer(db)
    const potion = createCatalogItem(db, {
      name: 'Heal',
      itemType: 'potion',
      description: 'Restore',
      rarity: 'common',
      mechanicalProperties: { kind: 'potion', healAmount: 6 },
      equipSlot: null,
      source: 'seed'
    })
    addItemToCharacter(db, character.id, potion.id)
    expect(consumePotion(db, character.id, potion.id)).toEqual({ ok: true, hpAfter: 16 })
  })

  it('unequips before removing an equipped item', () => {
    const db = createTestDb()
    const character = seedPlayer(db)
    const sword = createCatalogItem(db, {
      name: 'Remove Sword',
      itemType: 'weapon',
      description: 'Gone',
      rarity: 'common',
      mechanicalProperties: {
        kind: 'weapon',
        damageRoll: { diceCount: 1, diceSize: 6, modifier: 0 },
        damageType: 'physical'
      },
      equipSlot: 'weapon',
      source: 'seed'
    })
    const row = addItemToCharacter(db, character.id, sword.id)
    equipCharacterItem(db, character.id, row.id, 'weapon')
    expect(removeOwnedItem(db, character.id, row.id)).toBe(true)
    expect(db.prepare('SELECT COUNT(*) as count FROM character_items WHERE character_id = ?').get(character.id)).toEqual({
      count: 0
    })
  })
})
