import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createCharacter } from './characters'
import { createQuest, listCharacterQuests, listQuestsByCampaign, upsertCharacterQuest } from './quests'

function seedCampaign(db: ReturnType<typeof createTestDb>) {
  return createCampaign(db, {
    name: 'Quest Test',
    premisePrompt: 'A hero rises.',
    deathMode: 'legendary'
  })
}

describe('quests repository CRUD', () => {
  it('creates and lists quests by campaign', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const quest = createQuest(db, {
      campaignId: campaign.id,
      kind: 'side',
      title: 'Mill lights',
      summary: 'Investigate the mill.',
      scale: 'minor',
      objectives: [{ id: 'o1', text: 'Go to mill', done: false }]
    })
    expect(listQuestsByCampaign(db, campaign.id)).toEqual([quest])
  })

  it('upserts character quest status without leaking across characters', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const quest = createQuest(db, { campaignId: campaign.id, kind: 'side', title: 'Side', summary: 'Do a thing.' })
    const hero = createCharacter(db, { campaignId: campaign.id, name: 'Hero', characterClass: 'fighter', kind: 'player' })
    const ally = createCharacter(db, { campaignId: campaign.id, name: 'Ally', characterClass: 'rogue', kind: 'player' })
    upsertCharacterQuest(db, { characterId: hero.id, questId: quest.id, status: 'active', acceptedInGameDate: 1 })
    upsertCharacterQuest(db, { characterId: ally.id, questId: quest.id, status: 'available' })
    expect(listCharacterQuests(db, hero.id).map((row) => row.status)).toEqual(['active'])
    expect(listCharacterQuests(db, ally.id).map((row) => row.status)).toEqual(['available'])
  })
})
