import { afterEach, describe, expect, it } from 'vitest'
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
import { seedBanditLootEncounter, seedWolfLootEncounter } from './encounterQuestLootSmokeFixtures'

const originalEnrichment = process.env['ENRICH_REWARD_NARRATION']

afterEach(() => {
  if (originalEnrichment === undefined) {
    delete process.env['ENRICH_REWARD_NARRATION']
  } else {
    process.env['ENRICH_REWARD_NARRATION'] = originalEnrichment
  }
})

describe('wolf encounter loot smoke', () => {
  it('grants only misc with zero LLM calls — no weapon or magicItem in inventory', async () => {
    delete process.env['ENRICH_REWARD_NARRATION']
    const { db, campaign, region, player, encounter } = seedWolfLootEncounter()
    const provider = createScriptedProvider([])
    const loot = await runEncounterLootPass({
      db,
      provider,
      encounter,
      campaignId: campaign.id,
      playerCharacterId: player.id,
      regionId: region.id
    })
    expect(provider.calls).toHaveLength(0)
    expect(loot?.lootGrants?.length).toBeGreaterThan(0)
    for (const row of listCharacterItems(db, player.id)) {
      const item = getCatalogItemById(db, row.itemId)!
      expect(item.itemType).not.toBe('weapon')
      expect(item.itemType).not.toBe('magicItem')
    }
  })
})

describe('wolf loot validation smoke (enrichment on)', () => {
  it('rejects agent-proposed greatsword at validation layer', async () => {
    process.env['ENRICH_REWARD_NARRATION'] = 'true'
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
  it('grants at least one item within humanoid policy with zero LLM calls', async () => {
    delete process.env['ENRICH_REWARD_NARRATION']
    const { db, campaign, region, player, encounter } = seedBanditLootEncounter()
    const provider = createScriptedProvider([])
    const loot = await runEncounterLootPass({
      db,
      provider,
      encounter,
      campaignId: campaign.id,
      playerCharacterId: player.id,
      regionId: region.id
    })
    expect(provider.calls).toHaveLength(0)
    expect(loot?.lootGrants?.length).toBeGreaterThanOrEqual(1)
    const inventory = listCharacterItems(db, player.id)
    expect(inventory.length).toBeGreaterThanOrEqual(1)
    for (const row of inventory) {
      const item = getCatalogItemById(db, row.itemId)!
      expect(['weapon', 'misc', 'armor', 'potion']).toContain(item.itemType)
      expect(['common', 'uncommon']).toContain(item.rarity)
    }
  })

  it('appends loot_resolved with machine-readable payload', async () => {
    delete process.env['ENRICH_REWARD_NARRATION']
    const { db, campaign, region, player, encounter } = seedBanditLootEncounter()
    await runEncounterLootPass({
      db,
      provider: createScriptedProvider([]),
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
  it('grants within minor quest policy ceiling with zero LLM calls', async () => {
    delete process.env['ENRICH_REWARD_NARRATION']
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
    const provider = createScriptedProvider([])
    const loot = await runQuestLootPass({
      db,
      provider,
      campaignId: campaign.id,
      threadId: thread.id,
      regionId: region.id,
      playerCharacterId: player.id,
      playerLevel: player.level
    })
    expect(provider.calls).toHaveLength(0)
    expect(loot?.lootGrants).toHaveLength(1)
    const item = getCatalogItemById(db, loot!.lootGrants![0]!.itemId)!
    expect(['misc', 'potion']).toContain(item.itemType)
    expect(item.rarity).toBe('common')
  })
})
