import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createCharacter } from './characters'
import { createRegion } from './regions'
import { createStoryThread } from './storyThreads'
import { createWorldFact } from './worldFacts'
import {
  getCharacterQuest,
  getMainQuestByCampaign,
  importSideQuestsFromQuestHooks,
  listActiveQuestsForCharacter,
  listQuestsByCampaign,
  promoteWorldFactToQuest,
  seedCharacterQuestMembership,
  seedMainQuestForCampaign
} from './quests'

describe('quests repository seeding', () => {
  it('promotes quest_hook world facts idempotently', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Q', premisePrompt: 'Hook', deathMode: 'legendary' })
    const region = createRegion(db, { campaignId: campaign.id, name: 'Mill', description: 'Old mill.' })
    const hook = createWorldFact(db, {
      campaignId: campaign.id,
      regionId: region.id,
      factionTag: 'quest_hook',
      content: 'Strange lights in the mill.'
    })
    const first = promoteWorldFactToQuest(db, hook.id)
    const second = promoteWorldFactToQuest(db, hook.id)
    expect(first?.id).toBe(second?.id)
    expect(listQuestsByCampaign(db, campaign.id)).toHaveLength(1)
  })

  it('seeds main quest and character membership', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Q', premisePrompt: 'Hook', deathMode: 'legendary' })
    const thread = createStoryThread(db, { campaignId: campaign.id, title: 'Main arc', state: 'active', summary: 'Save the realm.' })
    seedMainQuestForCampaign(db, {
      campaignId: campaign.id,
      storyThreadId: thread.id,
      title: thread.title,
      summary: thread.summary
    })
    createWorldFact(db, { campaignId: campaign.id, regionId: null, factionTag: 'quest_hook', content: 'A side hook.' })
    importSideQuestsFromQuestHooks(db, campaign.id)
    const hero = createCharacter(db, { campaignId: campaign.id, name: 'Hero', characterClass: 'fighter', kind: 'player' })
    seedCharacterQuestMembership(db, campaign.id, hero.id, 0)
    expect(getCharacterQuest(db, hero.id, getMainQuestByCampaign(db, campaign.id)!.id)?.status).toBe('active')
    expect(listActiveQuestsForCharacter(db, hero.id).some((quest) => quest.kind === 'main')).toBe(true)
  })
})
