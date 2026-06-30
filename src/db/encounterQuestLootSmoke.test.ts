import { describe, expect, it } from 'vitest'
import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createCharacter } from './repositories/characters'
import { createRegion } from './repositories/regions'
import { getCatalogItemById } from './repositories/items'
import { listCharacterItems } from './repositories/characterItems'
import { listEventsByCampaign } from './repositories/events'
import { createStoryThread } from './repositories/storyThreads'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { runEncounterLootPass, runQuestLootPass } from '../main/lootPipeline'
import {
  BANDIT_LOOT_RESPONSE,
  QUEST_LOOT_RESPONSE,
  WOLF_LOOT_RESPONSE,
  seedBanditLootEncounter,
  seedWolfLootEncounter
} from './encounterQuestLootSmokeFixtures'

describe('wolf encounter loot smoke', () => {
  it('grants only misc — no weapon or magicItem in inventory', async () => {
    const { db, campaign, region, player, encounter } = seedWolfLootEncounter()
    const provider = createScriptedProvider([WOLF_LOOT_RESPONSE])
    const loot = await runEncounterLootPass({
      db,
      provider,
      encounter,
      campaignId: campaign.id,
      playerCharacterId: player.id,
      regionId: region.id
    })
    expect(loot?.lootGrants?.length).toBeGreaterThan(0)
    for (const row of listCharacterItems(db, player.id)) {
      const item = getCatalogItemById(db, row.itemId)!
      expect(item.itemType).not.toBe('weapon')
      expect(item.itemType).not.toBe('magicItem')
    }
  })
})

describe('wolf loot validation smoke', () => {
  it('rejects agent-proposed greatsword at validation layer', async () => {
    const { db, campaign, region, player, encounter } = seedWolfLootEncounter()
    const badResponse = JSON.stringify({
      narrationText: 'A sword falls from the wolf.',
      itemGrants: [
        {
          proposeNew: {
            name: 'Greatsword',
            description: 'Impossible loot.',
            itemType: 'weapon',
            rarityTier: 'common'
          }
        },
        {
          proposeNew: {
            name: 'Fang',
            description: 'A fang.',
            itemType: 'misc',
            rarityTier: 'common'
          }
        }
      ],
      nothingToFind: false
    })
    const provider = createScriptedProvider([badResponse])
    const loot = await runEncounterLootPass({
      db,
      provider,
      encounter,
      campaignId: campaign.id,
      playerCharacterId: player.id,
      regionId: region.id
    })
    expect(loot?.lootGrants).toHaveLength(1)
    expect(getCatalogItemById(db, loot!.lootGrants![0]!.itemId)!.itemType).toBe('misc')
  })
})

describe('bandit encounter loot smoke', () => {
  it('grants at least one item within humanoid policy', async () => {
    const { db, campaign, region, player, encounter } = seedBanditLootEncounter()
    const provider = createScriptedProvider([BANDIT_LOOT_RESPONSE])
    const loot = await runEncounterLootPass({
      db,
      provider,
      encounter,
      campaignId: campaign.id,
      playerCharacterId: player.id,
      regionId: region.id
    })
    expect(loot?.lootGrants?.length).toBeGreaterThanOrEqual(1)
    const inventory = listCharacterItems(db, player.id)
    const item = getCatalogItemById(db, inventory[0]!.itemId)!
    expect(['weapon', 'misc', 'armor', 'potion']).toContain(item.itemType)
    expect(['common', 'uncommon']).toContain(item.rarity)
  })

  it('appends loot_resolved with machine-readable payload', async () => {
    const { db, campaign, region, player, encounter } = seedBanditLootEncounter()
    await runEncounterLootPass({
      db,
      provider: createScriptedProvider([BANDIT_LOOT_RESPONSE]),
      encounter,
      campaignId: campaign.id,
      playerCharacterId: player.id,
      regionId: region.id
    })
    const event = listEventsByCampaign(db, campaign.id).find((e) => e.type === 'loot_resolved')
    expect(event?.payload.source).toBe('encounter_end')
    expect(event?.payload.policySummary).toMatchObject({ maxRarity: 'uncommon', maxGrantCount: 3 })
    expect(Array.isArray(event?.payload.acceptedItemIds)).toBe(true)
    expect(typeof event?.payload.rejectedCount).toBe('number')
  })
})

describe('quest completion loot smoke', () => {
  it('grants within minor quest policy ceiling', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Quest', premisePrompt: 'errand', deathMode: 'standard' })
    const region = createRegion(db, { campaignId: campaign.id, name: 'Village', description: 'Quiet hamlet' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player',
      level: 2
    })
    const thread = createStoryThread(db, {
      campaignId: campaign.id,
      title: 'Miller Errand',
      state: 'completed',
      summary: 'Deliver grain to the miller.'
    })
    const loot = await runQuestLootPass({
      db,
      provider: createScriptedProvider([QUEST_LOOT_RESPONSE]),
      campaignId: campaign.id,
      threadId: thread.id,
      regionId: region.id,
      playerCharacterId: player.id,
      playerLevel: player.level
    })
    const item = getCatalogItemById(db, loot!.lootGrants![0]!.itemId)!
    expect(item.itemType).toBe('misc')
    expect(item.rarity).toBe('common')
    expect(item.mechanicalProperties.kind).toBe('misc')
  })
})
