import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createStoryThread } from '../db/repositories/storyThreads'
import { getCharacterQuest, seedCharacterQuestMembership, seedMainQuestForCampaign, upsertCharacterQuest, createQuest } from '../db/repositories/quests'
import { buildQuestViews } from './questIpcHandlers'
import { canTransitionQuestStatus } from '../engine/quests'

describe('quest IPC list and accept', () => {
  it('lists and accepts a side quest', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'IPC', premisePrompt: 'Hook', deathMode: 'legendary' })
    const hero = createCharacter(db, { campaignId: campaign.id, name: 'Hero', characterClass: 'fighter', kind: 'player' })
    const thread = createStoryThread(db, { campaignId: campaign.id, title: 'Main', state: 'active', summary: 'Arc' })
    seedMainQuestForCampaign(db, { campaignId: campaign.id, storyThreadId: thread.id, title: thread.title, summary: thread.summary })
    const side = createQuest(db, { campaignId: campaign.id, kind: 'side', title: 'Side job', summary: 'Help the miller.' })
    upsertCharacterQuest(db, { characterId: hero.id, questId: side.id, status: 'available' })
    expect(canTransitionQuestStatus('available', 'active')).toBe(true)
    upsertCharacterQuest(db, { characterId: hero.id, questId: side.id, status: 'active', acceptedInGameDate: 1 })
    expect(getCharacterQuest(db, hero.id, side.id)?.status).toBe('active')
  })
})

describe('quest IPC character isolation', () => {
  it('keeps character B from seeing character A active side quest', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'IPC', premisePrompt: 'Hook', deathMode: 'legendary' })
    const heroA = createCharacter(db, { campaignId: campaign.id, name: 'A', characterClass: 'fighter', kind: 'player' })
    const heroB = createCharacter(db, { campaignId: campaign.id, name: 'B', characterClass: 'rogue', kind: 'player' })
    const side = createQuest(db, { campaignId: campaign.id, kind: 'side', title: 'Private job', summary: 'Only for A.' })
    seedCharacterQuestMembership(db, campaign.id, heroA.id, 0)
    seedCharacterQuestMembership(db, campaign.id, heroB.id, 0)
    upsertCharacterQuest(db, { characterId: heroA.id, questId: side.id, status: 'active', acceptedInGameDate: 1 })
    upsertCharacterQuest(db, { characterId: heroB.id, questId: side.id, status: 'available' })
    expect(buildQuestViews(db, heroA.id).find((row) => row.quest.id === side.id)?.characterQuest.status).toBe('active')
    expect(buildQuestViews(db, heroB.id).find((row) => row.quest.id === side.id)?.characterQuest.status).toBe('available')
  })
})
