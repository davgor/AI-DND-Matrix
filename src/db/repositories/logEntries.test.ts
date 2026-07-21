import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createCharacter } from './characters'
import {
  createLogEntry,
  listLogEntriesByCharacter,
  listLogEntriesByCharacterAndCategory,
  listLogEntriesRelatedToEntity
} from './logEntries'

function seedHero(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Log Test',
    premisePrompt: 'test',
    deathMode: 'legendary'
  })
  const hero = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Hero',
    characterClass: 'fighter',
    kind: 'player'
  })
  return { campaign, hero }
}

describe('logEntries repository: create and list', () => {
  it('creates and lists entries for a character', () => {
    const db = createTestDb()
    const { campaign, hero } = seedHero(db)
    const entry = createLogEntry(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      category: 'event',
      title: 'Ambush at the bridge',
      content: 'Bandits struck as we crossed.',
      learnedInGameDate: 3
    })

    expect(entry.category).toBe('event')
    expect(listLogEntriesByCharacter(db, hero.id)).toEqual([entry])
  })
})

describe('logEntries repository: category filter', () => {
  it('filters entries by category', () => {
    const db = createTestDb()
    const { campaign, hero } = seedHero(db)
    createLogEntry(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      category: 'place',
      title: 'Oakhollow',
      content: 'A logging village.',
      learnedInGameDate: 1
    })
    createLogEntry(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      category: 'person',
      title: 'Mira',
      content: 'The woodcutter who runs the general store.',
      learnedInGameDate: 2
    })

    expect(listLogEntriesByCharacterAndCategory(db, hero.id, 'place')).toHaveLength(1)
    expect(listLogEntriesByCharacterAndCategory(db, hero.id, 'person')[0]?.title).toBe('Mira')
  })
})

describe('logEntries repository: related entity', () => {
  it('lists only entries linked to a related entity for one character', () => {
    const db = createTestDb()
    const { campaign, hero } = seedHero(db)
    const ally = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Ally',
      characterClass: 'cleric',
      kind: 'player'
    })
    const npcId = 'npc-mira'

    const linked = createLogEntry(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      category: 'person',
      title: 'Mira',
      content: 'Runs the inn.',
      relatedEntityId: npcId,
      learnedInGameDate: 2
    })
    createLogEntry(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      category: 'place',
      title: 'Bridge',
      content: 'A bridge.',
      relatedEntityId: null,
      learnedInGameDate: 1
    })
    createLogEntry(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      category: 'person',
      title: 'Other',
      content: 'Someone else.',
      relatedEntityId: 'other-npc',
      learnedInGameDate: 3
    })
    createLogEntry(db, {
      campaignId: campaign.id,
      characterId: ally.id,
      category: 'person',
      title: 'Mira (ally)',
      content: 'Ally note.',
      relatedEntityId: npcId,
      learnedInGameDate: 4
    })

    expect(listLogEntriesRelatedToEntity(db, hero.id, npcId)).toEqual([linked])
  })
})
