import { describe, expect, it } from 'vitest'
import { computeTotalAC } from '../engine/armorClass'
import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createCharacter } from './repositories/characters'
import {
  addItemToCharacter,
  equipCharacterItem,
  getEquippedAccessoryBonuses,
  getEquippedShieldBonus,
  listCharacterItems
} from './repositories/characterItems'
import { computeCharacterTotalAc } from './repositories/itemCommerce'
import { persistNarrationCommerce } from './repositories/itemCommerce'
import { findCatalogItemByName } from './repositories/items'

function seed(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, { name: 'Equip', premisePrompt: 'x', deathMode: 'legendary' })
  return createCharacter(db, {
    campaignId: campaign.id,
    name: 'Fighter',
    characterClass: 'fighter',
    kind: 'player',
    currency: 200,
    stats: { abilityScores: { agility: 14 } }
  })
}

describe('equipment slots smoke', () => {
  it('covers 2H clear, sword+shield, dual 1H, accessory AC, and purchase', () => {
    const db = createTestDb()
    const character = seed(db)
    const agility = 14

    const greataxe = findCatalogItemByName(db, 'Greataxe')!
    const shortsword = findCatalogItemByName(db, 'Shortsword')!
    const handaxe = findCatalogItemByName(db, 'Handaxe')!
    const shield = findCatalogItemByName(db, 'Wooden Shield')!
    const ring = findCatalogItemByName(db, 'Ring of Warding')!

    const axeRow = addItemToCharacter(db, character.id, greataxe.id)
    const swordRow = addItemToCharacter(db, character.id, shortsword.id)
    const handaxeRow = addItemToCharacter(db, character.id, handaxe.id)
    const shieldRow = addItemToCharacter(db, character.id, shield.id)
    const ringRow = addItemToCharacter(db, character.id, ring.id)

    equipCharacterItem(db, character.id, handaxeRow.id, 'offHand')
    equipCharacterItem(db, character.id, axeRow.id, 'mainHand')
    expect(listCharacterItems(db, character.id).find((row) => row.id === handaxeRow.id)?.equippedSlot).toBeNull()

    equipCharacterItem(db, character.id, swordRow.id, 'mainHand')
    equipCharacterItem(db, character.id, shieldRow.id, 'offHand')
    expect(getEquippedShieldBonus(db, character.id)).toBe(2)

    equipCharacterItem(db, character.id, handaxeRow.id, 'offHand')
    expect(equipCharacterItem(db, character.id, handaxeRow.id, 'offHand').ok).toBe(true)

    equipCharacterItem(db, character.id, ringRow.id, 'ring1')
    const accessories = getEquippedAccessoryBonuses(db, character.id)
    expect(
      computeCharacterTotalAc(db, character.id, agility)
    ).toBe(
      computeTotalAC({
        agilityScore: agility,
        armorTier: 'none',
        shieldBonus: 0,
        accessoryAcBonus: accessories.acBonus
      })
    )

    const dagger = findCatalogItemByName(db, 'Dagger')!
    const purchase = persistNarrationCommerce(db, character.id, {
      itemPurchases: [{ catalogItemId: dagger.id }]
    })
    expect(purchase.purchases[0]?.ok).toBe(true)
  })
})
