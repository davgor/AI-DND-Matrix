import { describe, expect, it } from 'vitest'
import { computeTotalAC } from '../../engine/armorClass'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createCharacter } from './characters'
import {
  addItemToCharacter,
  equipCharacterItem,
  getEquippedAccessoryBonuses,
  getEquippedShieldBonus
} from './characterItems'
import { createCatalogItem, findCatalogItemByName } from './items'

function seedCharacter(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, { name: 'AC', premisePrompt: 'x', deathMode: 'legendary' })
  return createCharacter(db, {
    campaignId: campaign.id,
    name: 'Tank',
    characterClass: 'fighter',
    kind: 'player',
    stats: { abilityScores: { agility: 14 } }
  })
}

describe('equipped accessory and shield bonuses', () => {
  it('sums accessory AC and reverts when unequipped', () => {
    const db = createTestDb()
    const character = seedCharacter(db)
    const ring = findCatalogItemByName(db, 'Ring of Warding')!
    const row = addItemToCharacter(db, character.id, ring.id)
    equipCharacterItem(db, character.id, row.id, 'ring1')
    expect(getEquippedAccessoryBonuses(db, character.id)).toEqual({ acBonus: 1, attackBonus: 0 })
    const agility = 14
    expect(
      computeTotalAC({
        agilityScore: agility,
        armorTier: 'none',
        shieldBonus: getEquippedShieldBonus(db, character.id),
        accessoryAcBonus: getEquippedAccessoryBonuses(db, character.id).acBonus
      })
    ).toBe(computeTotalAC({ agilityScore: agility, armorTier: 'none' }) + 1)

    equipCharacterItem(db, character.id, row.id, 'ring1')
    db.prepare('UPDATE character_items SET equipped_slot = NULL WHERE id = ?').run(row.id)
    expect(getEquippedAccessoryBonuses(db, character.id).acBonus).toBe(0)
  })

  it('adds shield AC from offHand', () => {
    const db = createTestDb()
    const character = seedCharacter(db)
    const shield = findCatalogItemByName(db, 'Wooden Shield')!
    const row = addItemToCharacter(db, character.id, shield.id)
    equipCharacterItem(db, character.id, row.id, 'offHand')
    expect(getEquippedShieldBonus(db, character.id)).toBe(2)
  })

  it('sums attack bonus from accessories', () => {
    const db = createTestDb()
    const character = seedCharacter(db)
    const ring = createCatalogItem(db, {
      name: 'Ring of Striking',
      itemType: 'magicItem',
      description: 'Hits harder.',
      rarity: 'rare',
      mechanicalProperties: { kind: 'magicItem', acBonus: 0, attackBonus: 2, accessorySlot: 'ring2' },
      equipSlot: 'ring2',
      source: 'seed'
    })
    const row = addItemToCharacter(db, character.id, ring.id)
    equipCharacterItem(db, character.id, row.id, 'ring2')
    expect(getEquippedAccessoryBonuses(db, character.id).attackBonus).toBe(2)
  })
})
