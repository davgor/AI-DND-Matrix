import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createCharacter } from './characters'
import { listCharacterJournalEntries } from './characterJournalEntries'
import { persistJournalEntry } from './journalGrants'

describe('persistJournalEntry', () => {
  it('persists a proposed journal entry with the current in-game date', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Journal',
      premisePrompt: 'test',
      deathMode: 'legendary'
    })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Kael',
      characterClass: 'fighter',
      kind: 'player'
    })
    db.prepare('UPDATE campaigns SET in_game_date = 5 WHERE id = ?').run(campaign.id)

    persistJournalEntry(
      db,
      campaign.id,
      player.id,
      'Finished the job for the miller. Morgan helped out — kind of smelly but alright.'
    )

    const entries = listCharacterJournalEntries(db, player.id)
    expect(entries).toHaveLength(1)
    expect(entries[0]?.inGameDate).toBe(5)
    expect(entries[0]?.content).toContain('miller')
  })

  it('does nothing when no journal entry is proposed', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Journal',
      premisePrompt: 'test',
      deathMode: 'legendary'
    })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Kael',
      characterClass: 'fighter',
      kind: 'player'
    })

    persistJournalEntry(db, campaign.id, player.id, undefined)
    persistJournalEntry(db, campaign.id, player.id, '   ')

    expect(listCharacterJournalEntries(db, player.id)).toHaveLength(0)
  })
})
