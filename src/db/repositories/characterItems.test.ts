import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createCharacter } from './characters'
import {
  addItemToCharacter,
  listCharacterItems
} from './characterItems'
import { createCatalogItem } from './items'

function seedCharacter(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Items',
    premisePrompt: 'test',
    deathMode: 'legendary'
  })
  const character = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Hero',
    characterClass: 'fighter',
    kind: 'player'
  })
  return { campaign, character }
}

function seedWeapon(db: ReturnType<typeof createTestDb>, name: string, diceSize: number) {
  return createCatalogItem(db, {
    name,
    itemType: 'weapon',
    description: 'Sharp',
    rarity: 'common',
    mechanicalProperties: {
      kind: 'weapon',
      damageRoll: { diceCount: 1, diceSize, modifier: 0 },
      damageType: 'physical'
    },
    equipSlot: 'weapon',
    source: 'seed'
  })
}

describe('characterItems repository', () => {
  it('adds, lists, and stacks owned items for one character', () => {
    const db = createTestDb()
    const { character } = seedCharacter(db)
    const sword = seedWeapon(db, 'Test Sword', 8)

    addItemToCharacter(db, character.id, sword.id, 1)
    addItemToCharacter(db, character.id, sword.id, 2)

    const owned = listCharacterItems(db, character.id)
    expect(owned).toHaveLength(1)
    expect(owned[0]?.quantity).toBe(3)
  })

  it('never returns another character items', () => {
    const db = createTestDb()
    const first = seedCharacter(db)
    const second = seedCharacter(db)
    const item = createCatalogItem(db, {
      name: 'Private Relic',
      itemType: 'misc',
      description: 'Secret',
      rarity: 'common',
      mechanicalProperties: { kind: 'misc' },
      equipSlot: null,
      source: 'seed'
    })
    addItemToCharacter(db, first.character.id, item.id)

    expect(listCharacterItems(db, second.character.id)).toEqual([])
    expect(listCharacterItems(db, first.character.id)).toHaveLength(1)
  })
})
