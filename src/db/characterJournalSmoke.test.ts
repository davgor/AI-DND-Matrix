import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { persistNarrationSideEffects } from '../agents/dm'
import { closeFileTestDb, openFileTestDb, reopenFileTestDb } from './fileDbTestUtils'
import { createTestDb } from './testUtils'
import { runMigrations } from './migrations'
import { migrations } from './schema'
import { createCampaign } from './repositories/campaigns'
import { createCharacter } from './repositories/characters'
import {
  createCharacterJournalEntry,
  listCharacterJournalEntries
} from './repositories/characterJournalEntries'
import { createRegion } from './repositories/regions'

function seedCampaign(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Journal Run',
    premisePrompt: 'test',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Oakhollow',
    description: 'A quiet village.'
  })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Scout',
    characterClass: 'rogue',
    kind: 'player'
  })
  return { campaign, region, player }
}

describe('character journal end-to-end smoke', () => {
  it('persists a major-beat journal entry but not routine turns', async () => {
    const db = createTestDb()
    const { campaign, region, player } = seedCampaign(db)

    await persistNarrationSideEffects(
      db,
      {
        narrationText: 'You parry and strike again.',
      },
      { campaignId: campaign.id, regionId: region.id, characterId: player.id }
    )
    await persistNarrationSideEffects(
      db,
      {
        narrationText: 'You explore a side path.',
      },
      { campaignId: campaign.id, regionId: region.id, characterId: player.id }
    )
    await persistNarrationSideEffects(
      db,
      {
        narrationText: 'The miller thanks you warmly.',
        journalEntry:
          'Finished the job for the miller. Morgan helped out — kind of smelly but alright.'
      },
      { campaignId: campaign.id, regionId: region.id, characterId: player.id }
    )

    const entries = listCharacterJournalEntries(db, player.id)
    expect(entries).toHaveLength(1)
    expect(entries[0]?.content).toContain('miller')
  })

  it('returns an empty list for a character with no journal entries', async () => {
    const db = createTestDb()
    const { player } = seedCampaign(db)
    expect(listCharacterJournalEntries(db, player.id)).toEqual([])
  })
})

describe('character journal persistence smoke', () => {
  let dir: string | undefined
  let db: Database.Database | undefined

  afterEach(() => {
    closeFileTestDb(db)
    db = undefined
    if (dir) {
      rmSync(dir, { recursive: true, force: true })
      dir = undefined
    }
  })

  it('preserves journal entries and order after reopening the database file', async () => {
    dir = mkdtempSync(join(tmpdir(), 'journal-smoke-'))
    db = openFileTestDb(join(dir, 'save.sqlite'))
    runMigrations(db, migrations)
    const { campaign, player } = seedCampaign(db)
    createCharacterJournalEntry(db, {
      campaignId: campaign.id,
      characterId: player.id,
      content: 'Older beat.',
      inGameDate: 1,
      createdAt: '2026-01-01T00:00:00.000Z'
    })
    createCharacterJournalEntry(db, {
      campaignId: campaign.id,
      characterId: player.id,
      content: 'Newer beat.',
      inGameDate: 3,
      createdAt: '2026-01-03T00:00:00.000Z'
    })

    db = reopenFileTestDb(db)
    expect(listCharacterJournalEntries(db, player.id).map((row) => row.content)).toEqual([
      'Newer beat.',
      'Older beat.'
    ])
  })
})
