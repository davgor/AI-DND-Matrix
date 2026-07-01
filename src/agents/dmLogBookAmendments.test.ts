import { describe, expect, it } from 'vitest'
import { persistNarrationSideEffects } from './dm'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createLogEntry, getLogEntryById, listLogEntriesByCharacter } from '../db/repositories/logEntries'
import { createRegion } from '../db/repositories/regions'

describe('persistNarrationSideEffects log book amendments', () => {
  it('applies amendments and deletions for the acting character', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'T', premisePrompt: 'x', deathMode: 'legendary' })
    const region = createRegion(db, { campaignId: campaign.id, name: 'R', description: 'd' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'wizard',
      kind: 'player'
    })
    const entry = createLogEntry(db, {
      campaignId: campaign.id,
      characterId: player.id,
      category: 'thing',
      title: 'Old',
      content: 'Wrong name.',
      learnedInGameDate: 1
    })
    const otherEntry = createLogEntry(db, {
      campaignId: campaign.id,
      characterId: player.id,
      category: 'event',
      title: 'Keep',
      content: 'Stay.',
      learnedInGameDate: 1
    })

    persistNarrationSideEffects(
      db,
      {
        narrationText: 'Fixed.',
        logBookAmendments: [{ entryId: entry.id, title: 'Sword', content: 'A sharp blade.' }],
        logBookDeletions: ['invalid-id', otherEntry.id]
      },
      { campaignId: campaign.id, regionId: region.id, characterId: player.id }
    )

    expect(getLogEntryById(db, entry.id)?.title).toBe('Sword')
    expect(listLogEntriesByCharacter(db, player.id).some((row) => row.id === otherEntry.id)).toBe(false)
  })
})
