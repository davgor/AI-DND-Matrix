import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { assembleNarrationContext, persistNarrationSideEffects } from '../agents/dm'
import { createTestDb } from './testUtils'
import { runMigrations } from './migrations'
import { migrations } from './schema'
import { createCampaign } from './repositories/campaigns'
import { createCharacter } from './repositories/characters'
import { createLogEntry, listLogEntriesByCharacter } from './repositories/logEntries'
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

describe('log book end-to-end smoke', () => {
  it('persists multi-category entries and re-grounds narration context', () => {
    const db = createTestDb()
    const { campaign, region, player } = seedCampaign(db)

    persistNarrationSideEffects(
      db,
      {
        narrationText: 'You explore the village square.',
        logBookEntries: [
          { category: 'place', title: 'Oakhollow', content: 'A logging village.', relatedEntityId: region.id },
          { category: 'person', title: 'Mira', content: 'A woodcutter who sells supplies.' },
          { category: 'event', title: 'Market day', content: 'Traders filled the square.' }
        ]
      },
      { campaignId: campaign.id, regionId: region.id, characterId: player.id }
    )

    const entries = listLogEntriesByCharacter(db, player.id)
    expect(entries).toHaveLength(3)
    expect(entries.map((row) => row.category).sort()).toEqual(['event', 'person', 'place'])

    const context = assembleNarrationContext({ db, campaignId: campaign.id, regionId: region.id, characterId: player.id, playerInput: 'test action' })
    expect(context.logBookEntries.some((row) => row.title === 'Oakhollow')).toBe(true)
    expect(context.logBookEntries.every((row) => row.characterId === player.id)).toBe(true)
  })

  it('returns empty grouped state for a character with no entries', () => {
    const db = createTestDb()
    const { campaign, region, player } = seedCampaign(db)
    const context = assembleNarrationContext({ db, campaignId: campaign.id, regionId: region.id, characterId: player.id, playerInput: 'test action' })
    expect(context.logBookEntries).toEqual([])
  })
})

describe('log book persistence smoke', () => {
  let dir: string
  let db: Database.Database

  afterEach(() => {
    db?.close()
    if (dir) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('preserves log entries after reopening the database file', () => {
    dir = mkdtempSync(join(tmpdir(), 'logbook-smoke-'))
    db = new Database(join(dir, 'save.sqlite'))
    runMigrations(db, migrations)
    const { campaign, player } = seedCampaign(db)
    createLogEntry(db, {
      campaignId: campaign.id,
      characterId: player.id,
      category: 'thing',
      title: 'Rusty key',
      content: 'Opens an old cellar door.',
      learnedInGameDate: 2
    })
    const filePath = db.name
    db.close()

    const reopened = new Database(filePath)
    expect(listLogEntriesByCharacter(reopened, player.id)).toHaveLength(1)
    reopened.close()
  })
})
