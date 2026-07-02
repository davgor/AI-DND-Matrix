import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createCharacter } from './characters'
import {
  createLogEntry,
  deleteLogEntryForCharacter,
  getLogEntryById,
  listLogEntriesByCharacter,
  updateLogEntryForCharacter
} from './logEntries'

function seed(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, { name: 'Log', premisePrompt: 'x', deathMode: 'legendary' })
  const hero = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Hero',
    characterClass: 'wizard',
    kind: 'player'
  })
  const other = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Other',
    characterClass: 'rogue',
    kind: 'ai_party_member'
  })
  return { campaign, hero, other }
}

describe('log book CRUD', () => {
  it('creates and updates entries scoped to character', () => {
    const db = createTestDb()
    const { campaign, hero } = seed(db)
    const entry = createLogEntry(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      category: 'place',
      title: 'Old Title',
      content: 'Old content.',
      learnedInGameDate: 1
    })
    const updated = updateLogEntryForCharacter(db, hero.id, entry.id, {
      title: 'New Title',
      content: 'Updated content.'
    })
    expect(updated?.title).toBe('New Title')
    expect(getLogEntryById(db, entry.id)?.content).toBe('Updated content.')
  })

  it('enforces character isolation on update and delete', () => {
    const db = createTestDb()
    const { campaign, hero, other } = seed(db)
    const entry = createLogEntry(db, {
      campaignId: campaign.id,
      characterId: hero.id,
      category: 'event',
      title: 'Secret',
      content: 'Mine only.',
      learnedInGameDate: 1
    })
    expect(updateLogEntryForCharacter(db, other.id, entry.id, { title: 'Stolen' })).toBeNull()
    expect(deleteLogEntryForCharacter(db, other.id, entry.id)).toBe(false)
    expect(deleteLogEntryForCharacter(db, hero.id, entry.id)).toBe(true)
    expect(listLogEntriesByCharacter(db, hero.id)).toHaveLength(0)
  })
})
