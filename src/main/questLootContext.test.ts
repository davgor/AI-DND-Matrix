import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createRegion } from '../db/repositories/regions'
import { createStoryThread } from '../db/repositories/storyThreads'
import { assembleQuestLootContext } from './questLootContext'

function seedWorld() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: 'An adventure begins.',
    deathMode: 'legendary'
  })
  const character = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Aldric',
    characterClass: 'fighter',
    kind: 'player',
    level: 5
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'The Highlands',
    description: 'Rolling hills.'
  })
  return { db, campaign, character, region }
}

describe('assembleQuestLootContext missing or inactive threads', () => {
  it('returns null when the thread is not found or not completed', () => {
    const { db, campaign, character, region } = seedWorld()
    expect(
      assembleQuestLootContext({
        db,
        campaignId: campaign.id,
        threadId: 'missing',
        regionId: region.id,
        playerCharacterId: character.id,
        playerLevel: character.level
      })
    ).toBeNull()

    const active = createStoryThread(db, {
      campaignId: campaign.id,
      title: 'Gather Herbs',
      state: 'active',
      summary: 'A simple task.'
    })
    expect(
      assembleQuestLootContext({
        db,
        campaignId: campaign.id,
        threadId: active.id,
        regionId: region.id,
        playerCharacterId: character.id,
        playerLevel: character.level
      })
    ).toBeNull()
  })
})

describe('assembleQuestLootContext completed threads', () => {
  it('returns quest_complete context with hook text and scale', () => {
    const { db, campaign, character, region } = seedWorld()
    const thread = createStoryThread(db, {
      campaignId: campaign.id,
      title: 'Delivery Run',
      state: 'resolved',
      summary: 'Deliver a package.'
    })
    const result = assembleQuestLootContext({
      db,
      campaignId: campaign.id,
      threadId: thread.id,
      regionId: region.id,
      playerCharacterId: character.id,
      playerLevel: character.level
    })
    expect(result?.source).toBe('quest_complete')
    expect(result?.questHookText).toBe(thread.summary)
    expect(result?.questScale).toBe('minor')
  })

  it('marks major quests from title keywords', () => {
    const { db, campaign, character, region } = seedWorld()
    const thread = createStoryThread(db, {
      campaignId: campaign.id,
      title: 'Stop the Cult Ritual',
      state: 'done',
      summary: 'The party must stop the cultists.'
    })
    const result = assembleQuestLootContext({
      db,
      campaignId: campaign.id,
      threadId: thread.id,
      regionId: region.id,
      playerCharacterId: character.id,
      playerLevel: character.level
    })
    expect(result?.questScale).toBe('major')
  })
})
