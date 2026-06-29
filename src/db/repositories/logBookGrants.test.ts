import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createCharacter } from './characters'
import { listLogEntriesByCharacter } from './logEntries'
import { persistLogBookEntries } from './logBookGrants'

describe('persistLogBookEntries', () => {
  it('persists valid proposals and drops invalid categories', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Journal',
      premisePrompt: 'test',
      deathMode: 'legendary'
    })
    const hero = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player'
    })

    persistLogBookEntries(db, campaign.id, hero.id, [
      { category: 'place', title: 'Oakhollow', content: 'A quiet village.' },
      { category: 'not-a-category', title: 'Bad', content: 'Dropped.' },
      { category: 'person', title: 'Mira', content: 'Friendly woodcutter.' }
    ])

    const entries = listLogEntriesByCharacter(db, hero.id)
    expect(entries).toHaveLength(2)
    expect(entries.map((row) => row.category).sort()).toEqual(['person', 'place'])
    expect(entries.every((row) => row.learnedInGameDate === campaign.inGameDate)).toBe(true)
  })
})
