import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createStoryThread } from '../db/repositories/storyThreads'
import { getCharacterQuest, getMainQuestByCampaign, seedCharacterQuestMembership, seedMainQuestForCampaign } from '../db/repositories/quests'
import { persistQuestNarrationSideEffects } from './questNarration'

describe('persistQuestNarrationSideEffects proposals', () => {
  it('persists quest proposals for the acting player', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Q', premisePrompt: 'Hook', deathMode: 'legendary' })
    const player = createCharacter(db, { campaignId: campaign.id, name: 'Hero', characterClass: 'fighter', kind: 'player' })
    persistQuestNarrationSideEffects(
      db,
      {
        narrationText: 'A job offer.',
        questProposals: [{ kind: 'side', title: 'Deliver package', summary: 'Take the package to the docks.', scale: 'minor' }]
      },
      { campaignId: campaign.id, characterId: player.id }
    )
    const questRow = db.prepare('SELECT id FROM quests LIMIT 1').get() as { id: string }
    expect(getCharacterQuest(db, player.id, questRow.id)?.status).toBe('available')
  })
})

describe('persistQuestNarrationSideEffects story thread sync', () => {
  it('syncs story thread updates to the main quest without duplicate rows', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Q', premisePrompt: 'Epic hook', deathMode: 'legendary' })
    const player = createCharacter(db, { campaignId: campaign.id, name: 'Hero', characterClass: 'fighter', kind: 'player' })
    const thread = createStoryThread(db, { campaignId: campaign.id, title: 'Main', state: 'active', summary: 'Begin.' })
    seedMainQuestForCampaign(db, { campaignId: campaign.id, storyThreadId: thread.id, title: thread.title, summary: thread.summary })
    seedCharacterQuestMembership(db, campaign.id, player.id, 0)
    const main = getMainQuestByCampaign(db, campaign.id)!
    persistQuestNarrationSideEffects(
      db,
      { narrationText: 'Arc ends.', storyThreadUpdate: { threadId: thread.id, state: 'completed', summary: 'The realm is saved.' } },
      { campaignId: campaign.id, characterId: player.id }
    )
    expect(db.prepare('SELECT COUNT(*) AS c FROM quests WHERE kind = ?').get('main')).toEqual({ c: 1 })
    expect(getCharacterQuest(db, player.id, main.id)?.status).toBe('completed')
  })
})

describe('persistQuestNarrationSideEffects invalid completions', () => {
  it('drops invalid quest completion ids safely', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Q', premisePrompt: 'Hook', deathMode: 'legendary' })
    const player = createCharacter(db, { campaignId: campaign.id, name: 'Hero', characterClass: 'fighter', kind: 'player' })
    const result = persistQuestNarrationSideEffects(
      db,
      { narrationText: 'Nothing.', questCompletions: ['missing-id'] },
      { campaignId: campaign.id, characterId: player.id }
    )
    expect(result.completedQuestIds).toHaveLength(0)
  })
})
