import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { createTestDb } from '../testUtils'
import { createCampaign, getCampaignById } from '../repositories/campaigns'
import { createCharacter, listCharactersByCampaign } from '../repositories/characters'
import { createRegion } from '../repositories/regions'
import { createNpc } from '../repositories/npcs'
import { addItemToCharacter } from '../repositories/characterItems'
import { findCatalogItemByName } from '../repositories/items'
import { insertLlmUsageEvent } from '../repositories/llmUsageEvents'
import {
  CAMPAIGN_PACKAGE_MAGIC,
  PORTABLE_DEFAULT_OPTIONS
} from '../../shared/campaignPortability'
import { exportCampaignToPackageFile } from './exportCampaignPackage'
import { importCampaignFromPackageFile } from './importCampaignPackage'
import { openCampaignPackage } from './openCampaignPackage'

function seedMinimalCampaign(db: Database.Database, name: string) {
  const campaign = createCampaign(db, {
    name,
    premisePrompt: 'Premise',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: `${name} Region`,
    description: 'A place'
  })
  createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: `${name} NPC`,
    role: 'guide',
    disposition: 'friendly'
  })
  const character = createCharacter(db, {
    campaignId: campaign.id,
    name: `${name} Hero`,
    characterClass: 'fighter',
    kind: 'player'
  })
  return { campaign, character }
}

const exportOpts = {
  ...PORTABLE_DEFAULT_OPTIONS,
  appVersion: '0.0.0-test',
  readAssetFile: (): Buffer | null => null
}

describe('campaign package export', () => {
  it('writes a SQLite package that opens with portable_meta magic', () => {
    const db = createTestDb()
    const { campaign } = seedMinimalCampaign(db, 'Export')
    const dest = join(mkdtempSync(join(tmpdir(), 'aittrpg-pkg-')), 'export.aittrpg')
    const result = exportCampaignToPackageFile(db, campaign.id, dest, exportOpts)
    expect(result.ok).toBe(true)
    expect(existsSync(dest)).toBe(true)
    const pkg = openCampaignPackage(dest)
    expect(pkg.ok).toBe(true)
    if (!pkg.ok) return
    expect(pkg.meta.magic).toBe(CAMPAIGN_PACKAGE_MAGIC)
    expect(getCampaignById(pkg.db, campaign.id)?.name).toBe('Export')
    pkg.db.close()
  })

  it('excludes llm usage by default and omits API-key-like material', () => {
    const db = createTestDb()
    const { campaign } = seedMinimalCampaign(db, 'Secrets')
    insertLlmUsageEvent(db, {
      providerName: 'openai',
      modelId: 'gpt-4o-mini',
      purpose: 'play.narration',
      campaignId: campaign.id,
      outcome: 'success'
    })
    const dest = join(mkdtempSync(join(tmpdir(), 'aittrpg-pkg-')), 'secrets.aittrpg')
    exportCampaignToPackageFile(db, campaign.id, dest, exportOpts)
    const asText = readFileSync(dest).toString('utf8')
    expect(asText).not.toMatch(/sk-ant-|OPENAI_API_KEY|CLAUDE_API_KEY/)
    const pkg = openCampaignPackage(dest)
    expect(pkg.ok).toBe(true)
    if (!pkg.ok) return
    const usageCount = pkg.db
      .prepare('SELECT COUNT(*) AS c FROM llm_usage_events WHERE campaign_id = ?')
      .get(campaign.id) as { c: number }
    expect(usageCount.c).toBe(0)
    pkg.db.close()
  })
})

describe('campaign package import', () => {
  it('round-trips into a new campaign id', () => {
    const db = createTestDb()
    const { campaign, character } = seedMinimalCampaign(db, 'RoundTrip')
    const longsword = findCatalogItemByName(db, 'Longsword')
    expect(longsword).toBeTruthy()
    addItemToCharacter(db, character.id, longsword!.id)
    const dest = join(mkdtempSync(join(tmpdir(), 'aittrpg-pkg-')), 'roundtrip.aittrpg')
    expect(exportCampaignToPackageFile(db, campaign.id, dest, exportOpts).ok).toBe(true)
    const imported = importCampaignFromPackageFile(db, dest, {
      writeAssetFile: (logicalPath) => `/tmp/assets/${logicalPath}`
    })
    expect(imported.ok).toBe(true)
    if (!imported.ok) return
    expect(imported.campaignId).not.toBe(campaign.id)
    expect(getCampaignById(db, imported.campaignId)?.name).toBe('RoundTrip')
    expect(listCharactersByCampaign(db, imported.campaignId)[0]?.name).toBe('RoundTrip Hero')
  })

  it('rejects corrupt files without inserting a campaigns row', () => {
    const db = createTestDb()
    const before = db.prepare('SELECT COUNT(*) AS c FROM campaigns').get() as { c: number }
    const dest = join(mkdtempSync(join(tmpdir(), 'aittrpg-pkg-')), 'corrupt.aittrpg')
    writeFileSync(dest, 'not-a-sqlite-database')
    const imported = importCampaignFromPackageFile(db, dest, {
      writeAssetFile: (logicalPath) => `/tmp/${logicalPath}`
    })
    expect(imported.ok).toBe(false)
    if (imported.ok) return
    expect(['corrupt_package', 'invalid_package']).toContain('code' in imported ? imported.code : '')
    const after = db.prepare('SELECT COUNT(*) AS c FROM campaigns').get() as { c: number }
    expect(after.c).toBe(before.c)
  })
})
