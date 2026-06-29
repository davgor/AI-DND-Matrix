import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createCharacter } from './characters'
import { createLogEntry, listLogEntriesByCharacter } from './logEntries'

describe('logEntries isolation', () => {
  it('never returns another character log entries', () => {
    const db = createTestDb()
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
    const ally = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Ally',
      characterClass: 'cleric',
      kind: 'ai_party_member'
    })
    createLogEntry(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      category: 'thing',
      title: 'Rusty key',
      content: 'Found in the cellar.',
      learnedInGameDate: 4
    })
    createLogEntry(db, {
      campaignId: campaign.id,
      characterId: ally.id,
      category: 'beast',
      title: 'Wolf',
      content: 'Grey and scarred.',
      learnedInGameDate: 4
    })

    expect(listLogEntriesByCharacter(db, hero.id)).toHaveLength(1)
    expect(listLogEntriesByCharacter(db, ally.id)).toHaveLength(1)
    expect(listLogEntriesByCharacter(db, hero.id)[0]?.characterId).toBe(hero.id)
  })
})
