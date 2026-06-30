import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createRegion } from '../db/repositories/regions'
import { createNpc, setNpcEncounterOutcome } from '../db/repositories/npcs'
import { listEventsByCampaign } from '../db/repositories/events'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import {
  runEncounterLootPass,
  runQuestLootPass,
  shouldSkipQuestLoot
} from './lootPipeline'
import type { CombatEncounter } from '../shared/combat/types'
import { createStoryThread } from '../db/repositories/storyThreads'

function makeResolvedEncounter(campaignId: string, npcId: string, playerId: string): CombatEncounter {
  return {
    id: 'enc-1',
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

describe('encounter loot pipeline', () => {
  it('encounter loot pass grants items and appends loot_resolved', async () => {
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
    const bandit = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Bandit',
      role: 'thug',
      disposition: 'hostile'
    })
    setNpcEncounterOutcome(db, bandit.id, 'slain')

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
    expect(loot?.lootGrants).toHaveLength(1)
    expect(listEventsByCampaign(db, campaign.id).some((e) => e.type === 'loot_resolved')).toBe(true)
  })
})

describe('quest loot pipeline', () => {
  it('skips quest loot when encounter loot already ran same turn', async () => {
    expect(shouldSkipQuestLoot(true)).toBe(true)
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'T', premisePrompt: 't', deathMode: 'standard' })
    const region = createRegion(db, { campaignId: campaign.id, name: 'R', description: 'd' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player',
      level: 2
    })
    const thread = createStoryThread(db, {
      campaignId: campaign.id,
      title: 'Errand',
      state: 'completed',
      summary: 'Deliver grain.'
    })
    const provider = createScriptedProvider([
      JSON.stringify({
        narrationText: 'Should not run.',
        itemGrants: [],
        nothingToFind: true
      })
    ])
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
