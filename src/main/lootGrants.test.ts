import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { listCharacterItems } from '../db/repositories/characterItems'
import { findCatalogItemByName } from '../db/repositories/items'
import { filterCatalogCandidatesForPolicy, validateAndPersistLootGrants } from './lootGrants'
import type { LootPolicy } from '../shared/loot/types'

function beastPolicy(): LootPolicy {
  return { allowedItemTypes: ['misc'], maxRarity: 'common', maxGrantCount: 2, catalogRetrieveFirst: true }
}

function seedCharacter() {
  const db = createTestDb()
  const campaign = createCampaign(db, { name: 'Loot', premisePrompt: 'test', deathMode: 'standard' })
  const character = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Hero',
    characterClass: 'fighter',
    kind: 'player'
  })
  return { db, character }
}

describe('validateAndPersistLootGrants rejections', () => {
  it('rejects greatsword proposal under beast policy', () => {
    const { db, character } = seedCharacter()
    const result = validateAndPersistLootGrants(db, character.id, beastPolicy(), [
      {
        proposeNew: {
          name: 'Greatsword',
          description: 'A massive blade.',
          itemType: 'weapon',
          rarityTier: 'common'
        }
      }
    ])
    expect(result.accepted).toHaveLength(0)
    expect(result.rejected[0]?.reason).toBe('forbidden_item_type')
  })

  it('drops unknown catalog ids', () => {
    const { db, character } = seedCharacter()
    const result = validateAndPersistLootGrants(db, character.id, beastPolicy(), [
      { catalogItemId: 'missing-item-id' }
    ])
    expect(result.rejected[0]?.reason).toBe('unknown_catalog_id')
  })

  it('rejects rarity above policy cap', () => {
    const { db, character } = seedCharacter()
    const policy: LootPolicy = {
      allowedItemTypes: ['weapon'],
      maxRarity: 'common',
      maxGrantCount: 1,
      catalogRetrieveFirst: true
    }
    const result = validateAndPersistLootGrants(db, character.id, policy, [
      {
        proposeNew: {
          name: 'Epic Blade',
          description: 'Too strong.',
          itemType: 'weapon',
          rarityTier: 'epic'
        }
      }
    ])
    expect(result.rejected[0]?.reason).toBe('rarity_above_cap')
  })
})

describe('validateAndPersistLootGrants acceptances', () => {
  it('grants valid misc proposal under beast policy', () => {
    const { db, character } = seedCharacter()
    const result = validateAndPersistLootGrants(db, character.id, beastPolicy(), [
      {
        proposeNew: {
          name: 'Wolf Fang',
          description: 'A sharp trophy.',
          itemType: 'misc',
          rarityTier: 'common'
        }
      }
    ])
    expect(result.accepted).toHaveLength(1)
    expect(listCharacterItems(db, character.id)).toHaveLength(1)
  })

  it('persists catalog retrieve grant to inventory', () => {
    const { db, character } = seedCharacter()
    const dagger = findCatalogItemByName(db, 'Dagger')!
    const result = validateAndPersistLootGrants(db, character.id, {
      allowedItemTypes: ['weapon', 'misc'],
      maxRarity: 'uncommon',
      maxGrantCount: 3,
      catalogRetrieveFirst: true
    }, [{ catalogItemId: dagger.id }])
    expect(result.accepted).toHaveLength(1)
    expect(listCharacterItems(db, character.id).some((row) => row.itemId === dagger.id)).toBe(true)
  })
})

describe('filterCatalogCandidatesForPolicy', () => {
  it('filters by allowed types and rarity ceiling', () => {
    const db = createTestDb()
    const filtered = filterCatalogCandidatesForPolicy(db, beastPolicy())
    expect(filtered.every((item) => item.itemType === 'misc' && item.rarity === 'common')).toBe(true)
  })
})
