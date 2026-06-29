import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { createCampaign, getCampaignById } from '../repositories/campaigns'
import { runMigrations } from '../migrations'
import { migrations } from '../schema'
import { checkCatalogIntegrity } from './integrity'
import { listAllCreatures } from './creatures'

describe('preseed catalog migration compatibility', () => {
  let dir: string

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  it('keeps existing campaign data valid after upgrading a pre-catalog save', () => {
    dir = mkdtempSync(join(tmpdir(), 'catalog-migration-test-'))
    const filePath = join(dir, 'save.sqlite')

    const oldDb = new Database(filePath)
    runMigrations(oldDb, migrations.slice(0, 11))
    const campaign = createCampaign(oldDb, {
      name: 'The Glass Spire',
      premisePrompt: 'A tower of mirrors traps wandering souls.',
      deathMode: 'standard'
    })
    oldDb.close()

    const upgradedDb = new Database(filePath)
    runMigrations(upgradedDb, migrations)

    expect(getCampaignById(upgradedDb, campaign.id)).toEqual(campaign)
    expect(listAllCreatures(upgradedDb).length).toBeGreaterThan(0)
    expect(checkCatalogIntegrity(upgradedDb).healthy).toBe(true)

    upgradedDb.close()
  })
})
