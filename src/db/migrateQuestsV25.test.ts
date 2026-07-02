import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { runMigrations } from './migrations'
import { migrations } from './schema'
import { createCampaign } from './repositories/campaigns'
import { createCharacter } from './repositories/characters'
import { createRegion } from './repositories/regions'
import { createStoryThread } from './repositories/storyThreads'
import { createWorldFact } from './repositories/worldFacts'
import { getMainQuestByCampaign, listCharacterQuests } from './repositories/quests'

function openLegacyDbAtVersion23(): Database.Database {
  const db = new Database(':memory:')
  const legacy = migrations.filter((migration) => migration.version <= 23)
  runMigrations(db, legacy)
  return db
}

describe('migration v25 quests backfill', () => {
  it('creates main quest and side quests for legacy campaigns', () => {
    const db = openLegacyDbAtVersion23()
    const campaign = createCampaign(db, {
      name: 'Legacy',
      premisePrompt: 'Old save hook.',
      deathMode: 'standard'
    })
    const region = createRegion(db, {
      campaignId: campaign.id,
      name: 'Village',
      description: 'A village.'
    })
    createStoryThread(db, {
      campaignId: campaign.id,
      title: 'Old arc',
      state: 'active',
      summary: 'Continue the story.'
    })
    createWorldFact(db, {
      campaignId: campaign.id,
      regionId: region.id,
      factionTag: 'quest_hook',
      content: 'Missing child near the well.'
    })
    const hero = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player'
    })

    runMigrations(db, migrations.filter((migration) => migration.version >= 24))

    const main = getMainQuestByCampaign(db, campaign.id)
    expect(main?.title).toBe('Old arc')
    expect(main?.hookLine).toBe('Old save hook.')
    const rows = listCharacterQuests(db, hero.id)
    expect(rows.some((row) => row.status === 'active')).toBe(true)
    expect(rows.some((row) => row.status === 'available')).toBe(true)
  })
})
