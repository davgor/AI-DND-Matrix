import { describe, expect, it } from 'vitest'
import { resolveXPBudget } from '../engine/xpBudget'
import { assembleEncounterXpContext, encounterEligibleForXp } from './encounterXpContext'
import { assembleQuestXpContext } from './questXpContext'
import {
  makeEncounter,
  seedEncounterLootBase
} from './encounterLootContext.testFixtures'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createRegion } from '../db/repositories/regions'
import { createNpc, setNpcEncounterOutcome } from '../db/repositories/npcs'
import { createStoryThread } from '../db/repositories/storyThreads'

describe('assembleEncounterXpContext', () => {
  it('includes foe difficulty signals for budget resolver', () => {
    const { db, campaign, region, player } = seedEncounterLootBase()
    const bandit = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Bandit',
      role: 'thug',
      disposition: 'hostile'
    })
    setNpcEncounterOutcome(db, bandit.id, 'slain')
    const encounter = makeEncounter(campaign.id, [
      { kind: 'player', id: player.id },
      { kind: 'npc', id: bandit.id }
    ])
    const ctx = assembleEncounterXpContext(db, {
      encounter,
      campaignId: campaign.id,
      playerCharacterId: player.id,
      regionId: region.id
    })
    expect(ctx).not.toBeNull()
    const budget = resolveXPBudget(ctx!)
    expect(budget.max).toBeGreaterThan(0)
  })

  it('returns null for all-fled zero-slain encounter', () => {
    const { db, campaign, region, player } = seedEncounterLootBase()
    const wolf = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Wolf',
      role: 'predator',
      disposition: 'hostile'
    })
    setNpcEncounterOutcome(db, wolf.id, 'flee')
    const encounter = makeEncounter(campaign.id, [
      { kind: 'player', id: player.id },
      { kind: 'npc', id: wolf.id }
    ])
    expect(encounterEligibleForXp(encounter)).toBe(true)
    expect(
      assembleEncounterXpContext(db, {
        encounter,
        campaignId: campaign.id,
        playerCharacterId: player.id,
        regionId: region.id
      })
    ).toBeNull()
  })
})

describe('assembleQuestXpContext', () => {
  it('includes quest scale from 035.5 heuristics', () => {
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
      title: 'Ancient dragon ritual',
      state: 'completed',
      summary: 'A long summary.'
    })
    const ctx = assembleQuestXpContext({
      db,
      campaignId: campaign.id,
      threadId: thread.id,
      regionId: region.id,
      playerCharacterId: player.id,
      playerLevel: player.level
    })
    expect(ctx?.questScale).toBe('major')
    expect(resolveXPBudget(ctx!).max).toBeGreaterThan(
      resolveXPBudget({
        source: 'quest_complete',
        foes: [],
        campaignId: campaign.id,
        regionId: region.id,
        playerCharacterId: player.id,
        playerLevel: player.level,
        questScale: 'minor'
      }).max
    )
  })
})
