import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createCharacter } from './characters'
import { listCharacterItems } from './characterItems'
import { createCatalogItem } from './items'
import { persistItemGrants } from './itemGrants'

function seedPlayer(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Loot',
    premisePrompt: 'test',
    deathMode: 'legendary'
  })
  return createCharacter(db, {
    campaignId: campaign.id,
    name: 'Looter',
    characterClass: 'rogue',
    kind: 'player'
  })
}

describe('persistItemGrants catalog references', () => {
  it('grants an existing catalog item and ignores unknown ids', () => {
    const db = createTestDb()
    const character = seedPlayer(db)
    const item = createCatalogItem(db, {
      name: 'Reward Blade',
      itemType: 'weapon',
      description: 'Loot',
      rarity: 'common',
      mechanicalProperties: {
        kind: 'weapon',
        damageRoll: { diceCount: 1, diceSize: 6, modifier: 0 },
        damageType: 'physical'
      },
      equipSlot: 'mainHand',
      source: 'seed'
    })

    persistItemGrants(db, character.id, [
      { catalogItemId: item.id },
      { catalogItemId: 'missing-item' }
    ])

    expect(listCharacterItems(db, character.id)).toHaveLength(1)
  })
})

describe('persistItemGrants proposed items', () => {
  it('canonicalizes and grants a proposed new item without agent-supplied mechanics', () => {
    const db = createTestDb()
    const character = seedPlayer(db)

    persistItemGrants(db, character.id, [
      {
        proposeNew: {
          name: 'Starfall Charm',
          description: 'A charm that hums with night magic.',
          itemType: 'magicItem',
          rarityTier: 'uncommon'
        }
      }
    ])

    const owned = listCharacterItems(db, character.id)
    expect(owned).toHaveLength(1)
    expect(owned[0]?.item.source).toBe('ai_proposed')
    expect(owned[0]?.item.mechanicalProperties.kind).toBe('magicItem')
  })

  it('drops invalid proposed item types', () => {
    const db = createTestDb()
    const character = seedPlayer(db)
    persistItemGrants(db, character.id, [
      {
        proposeNew: {
          name: 'Bad Type',
          description: 'Nope',
          itemType: 'relic' as 'weapon',
          rarityTier: 'common'
        }
      }
    ])
    expect(listCharacterItems(db, character.id)).toHaveLength(0)
  })
})
