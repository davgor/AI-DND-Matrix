import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createCharacter } from './characters'
import {
  createCharacterJournalEntry,
  listCharacterJournalEntries
} from './characterJournalEntries'

function seedCharacters(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Journal',
    premisePrompt: 'test',
    deathMode: 'legendary'
  })
  const playerA = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'fighter',
    kind: 'player'
  })
  const playerB = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Mira',
    characterClass: 'rogue',
    kind: 'player'
  })
  return { campaign, playerA, playerB }
}

describe('characterJournalEntries repository', () => {
  it('lists entries in reverse-chronological order', () => {
    const db = createTestDb()
    const { campaign, playerA } = seedCharacters(db)

    createCharacterJournalEntry(db, {
      campaignId: campaign.id,
      characterId: playerA.id,
      content: 'Older note.',
      inGameDate: 1,
      createdAt: '2026-01-01T00:00:00.000Z'
    })
    createCharacterJournalEntry(db, {
      campaignId: campaign.id,
      characterId: playerA.id,
      content: 'Newer note.',
      inGameDate: 3,
      createdAt: '2026-01-03T00:00:00.000Z'
    })
    createCharacterJournalEntry(db, {
      campaignId: campaign.id,
      characterId: playerA.id,
      content: 'Middle note.',
      inGameDate: 2,
      createdAt: '2026-01-02T00:00:00.000Z'
    })

    const entries = listCharacterJournalEntries(db, playerA.id)
    expect(entries.map((row) => row.content)).toEqual(['Newer note.', 'Middle note.', 'Older note.'])
  })

  it('never returns another character journal entries', () => {
    const db = createTestDb()
    const { campaign, playerA, playerB } = seedCharacters(db)

    createCharacterJournalEntry(db, {
      campaignId: campaign.id,
      characterId: playerA.id,
      content: 'Kael private note.',
      inGameDate: 1
    })
    createCharacterJournalEntry(db, {
      campaignId: campaign.id,
      characterId: playerB.id,
      content: 'Mira private note.',
      inGameDate: 1
    })

    expect(listCharacterJournalEntries(db, playerA.id)).toHaveLength(1)
    expect(listCharacterJournalEntries(db, playerA.id)[0]?.content).toBe('Kael private note.')
    expect(listCharacterJournalEntries(db, playerB.id)[0]?.content).toBe('Mira private note.')
  })
})
