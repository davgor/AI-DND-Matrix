import { describe, expect, it } from 'vitest'
import { resolveDifficultyXP } from '../engine/difficultyXp'
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

function seedSlainBanditWithCompanion() {
  const { db, campaign, region, player } = seedEncounterLootBase()
  const bandit = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Bandit',
    role: 'thug',
    disposition: 'hostile'
  })
  setNpcEncounterOutcome(db, bandit.id, 'slain')
  createCharacter(db, {
    campaignId: campaign.id,
    name: 'Sage',
    characterClass: 'mage',
    kind: 'ai_party_member',
    level: 2,
    ownerPlayerCharacterId: player.id
  })
  return { db, campaign, region, player, bandit }
}

describe('assembleEncounterXpContext', () => {
  it('includes foe summaries and party comp for the difficulty rater', () => {
    const { db, campaign, region, player, bandit } = seedSlainBanditWithCompanion()
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
    expect(ctx!.foes).toHaveLength(1)
    expect(ctx!.partyMembers).toEqual([{ archetype: 'mage', level: 2 }])
    expect(resolveDifficultyXP('medium', ctx!.playerLevel)).toBeGreaterThan(0)
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
  it('includes quest scale from 035.5 heuristics and party comp', () => {
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
    expect(ctx?.partyMembers).toEqual([])
  })
})
