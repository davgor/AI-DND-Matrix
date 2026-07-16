import { afterEach, describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createRegion } from '../db/repositories/regions'
import { createNpc, setNpcEncounterOutcome } from '../db/repositories/npcs'
import { listEventsByCampaign } from '../db/repositories/events'
import { getCatalogItemById } from '../db/repositories/items'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import {
  runEncounterLootPass,
  runQuestLootPass,
  shouldSkipQuestLoot
} from './lootPipeline'
import type { CombatEncounter } from '../shared/combat/types'
import { createStoryThread } from '../db/repositories/storyThreads'

const originalEnrichment = process.env['ENRICH_REWARD_NARRATION']

afterEach(() => {
  if (originalEnrichment === undefined) {
    delete process.env['ENRICH_REWARD_NARRATION']
  } else {
    process.env['ENRICH_REWARD_NARRATION'] = originalEnrichment
  }
})

function makeResolvedEncounter(campaignId: string, npcId: string, playerId: string): CombatEncounter {
  return {
    id: `enc-${npcId}`,
    campaignId,
    phase: 'resolved',
    outcome: 'defeated',
    initiativeOrder: [],
    activeTurnIndex: 0,
    round: 1,
    participantIds: [
      { kind: 'player', id: playerId },
      { kind: 'npc', id: npcId }
    ],
    pursuitState: 'engaged',
    exitedCombatantIds: [],
    startedAt: new Date().toISOString()
  }
}

function seedBanditFixture() {
  const db = createTestDb()
  const campaign = createCampaign(db, { name: 'T', premisePrompt: 't', deathMode: 'standard' })
  const region = createRegion(db, { campaignId: campaign.id, name: 'R', description: 'd' })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Hero',
    characterClass: 'fighter',
    kind: 'player',
    level: 3
  })
  return { db, campaign, region, player }
}

function seedSlainBandit(fixture: ReturnType<typeof seedBanditFixture>, name: string) {
  const bandit = createNpc(fixture.db, {
    campaignId: fixture.campaign.id,
    regionId: fixture.region.id,
    name,
    role: 'thug',
    disposition: 'hostile'
  })
  setNpcEncounterOutcome(fixture.db, bandit.id, 'slain')
  return bandit
}

describe('encounter loot pipeline — default deterministic path', () => {
  it('grants catalog items within policy with zero LLM calls', async () => {
    delete process.env['ENRICH_REWARD_NARRATION']
    const fixture = seedBanditFixture()
    const { db, campaign, region, player } = fixture
    const bandit = seedSlainBandit(fixture, 'Bandit')

    const provider = createScriptedProvider([])
    const loot = await runEncounterLootPass({
      db,
      provider,
      encounter: makeResolvedEncounter(campaign.id, bandit.id, player.id),
      campaignId: campaign.id,
      playerCharacterId: player.id,
      regionId: region.id
    })
    expect(provider.calls).toHaveLength(0)
    expect(loot?.lootGrants?.length).toBeGreaterThanOrEqual(1)
    expect(loot?.lootGrants?.length).toBeLessThanOrEqual(3)
    for (const grant of loot!.lootGrants!) {
      const item = getCatalogItemById(db, grant.itemId)!
      expect(['misc', 'weapon', 'armor', 'potion']).toContain(item.itemType)
      expect(['common', 'uncommon']).toContain(item.rarity)
      expect(loot?.lootNarration).toContain(item.name)
    }
    expect(listEventsByCampaign(db, campaign.id).some((e) => e.type === 'loot_resolved')).toBe(true)
  })

  it('variety guard: a repeat encounter does not grant identical items', async () => {
    delete process.env['ENRICH_REWARD_NARRATION']
    const fixture = seedBanditFixture()
    const { db, campaign, region, player } = fixture
    const bandit = seedSlainBandit(fixture, 'Bandit')
    const encounter = makeResolvedEncounter(campaign.id, bandit.id, player.id)

    const runPass = () =>
      runEncounterLootPass({
        db,
        provider: createScriptedProvider([]),
        encounter,
        campaignId: campaign.id,
        playerCharacterId: player.id,
        regionId: region.id
      })
    const first = await runPass()
    const second = await runPass()
    const firstIds = new Set(first!.lootGrants!.map((g) => g.itemId))
    for (const grant of second!.lootGrants!) {
      expect(firstIds.has(grant.itemId)).toBe(false)
    }
  })
})

describe('encounter loot pipeline — enrichment restores LLM path', () => {
  it('uses the loot agent (including proposeNew homebrew) when ENRICH_REWARD_NARRATION=true', async () => {
    process.env['ENRICH_REWARD_NARRATION'] = 'true'
    const fixture = seedBanditFixture()
    const { db, campaign, region, player } = fixture
    const bandit = seedSlainBandit(fixture, 'Bandit')

    const provider = createScriptedProvider([
      JSON.stringify({
        narrationText: 'You find a coin pouch.',
        itemGrants: [
          {
            proposeNew: {
              name: 'Bandit Coin Pouch',
              description: 'A few copper coins.',
              itemType: 'misc',
              rarityTier: 'common'
            }
          }
        ],
        nothingToFind: false
      })
    ])
    const loot = await runEncounterLootPass({
      db,
      provider,
      encounter: makeResolvedEncounter(campaign.id, bandit.id, player.id),
      campaignId: campaign.id,
      playerCharacterId: player.id,
      regionId: region.id
    })
    expect(provider.calls).toHaveLength(1)
    expect(loot?.lootGrants).toHaveLength(1)
    expect(loot?.lootGrants?.[0]?.itemName).toBe('Bandit Coin Pouch')
    expect(loot?.lootNarration).toBe('You find a coin pouch.')
  })
})

describe('quest loot pipeline', () => {
  it('grants within minor quest policy with zero LLM calls by default', async () => {
    delete process.env['ENRICH_REWARD_NARRATION']
    const { db, campaign, region, player } = seedBanditFixture()
    const thread = createStoryThread(db, {
      campaignId: campaign.id,
      title: 'Errand',
      state: 'completed',
      summary: 'Deliver grain.'
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

  it('skips quest loot when encounter loot already ran same turn', async () => {
    expect(shouldSkipQuestLoot(true)).toBe(true)
    const { db, campaign, region, player } = seedBanditFixture()
    const thread = createStoryThread(db, {
      campaignId: campaign.id,
      title: 'Errand',
      state: 'completed',
      summary: 'Deliver grain.'
    })
    const provider = createScriptedProvider([])
    const loot = await runQuestLootPass({
      db,
      provider,
      campaignId: campaign.id,
      threadId: thread.id,
      regionId: region.id,
      playerCharacterId: player.id,
      playerLevel: player.level,
      encounterLootRanThisTurn: true
    })
    expect(loot).toBeNull()
    expect(provider.calls).toHaveLength(0)
  })
})
