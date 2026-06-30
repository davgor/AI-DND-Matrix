import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { createCampaign, getCampaignById } from './repositories/campaigns'
import { createRegion, getRegionById, listRegionsByCampaign } from './repositories/regions'
import { runMigrations } from './migrations'
import { migrations } from './schema'

describe('opening an older save file applies pending migrations', () => {
  let dir: string

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  it('upgrades a file with only migrations 1-2 applied, keeping prior data intact', () => {
    dir = mkdtempSync(join(tmpdir(), 'migration-upgrade-test-'))
    const filePath = join(dir, 'save.sqlite')

    const oldDb = new Database(filePath)
    runMigrations(oldDb, migrations.slice(0, 2))
    const campaign = createCampaign(oldDb, {
      name: 'The Sunken Crown',
      premisePrompt: 'A flooded kingdom hides an ancient throne.',
      deathMode: 'legendary'
    })
    const region = createRegion(oldDb, {
      campaignId: campaign.id,
      name: 'Oakhollow',
      description: 'A quiet logging village.'
    })
    oldDb.close()

    const upgradedDb = new Database(filePath)
    runMigrations(upgradedDb, migrations)

    const tableNames = upgradedDb
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => (row as { name: string }).name)
    expect(tableNames).toContain('characters')
    expect(tableNames).toContain('npcs')
    expect(tableNames).toContain('sessions')

    expect(getCampaignById(upgradedDb, campaign.id)).toEqual(campaign)
    expect(getRegionById(upgradedDb, region.id)).toEqual(region)
    expect(listRegionsByCampaign(upgradedDb, campaign.id)).toEqual([region])

    upgradedDb.close()
  })
})
