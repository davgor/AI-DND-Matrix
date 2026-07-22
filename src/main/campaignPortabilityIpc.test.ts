import { describe, expect, it, vi } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createTestDb } from '../db/testUtils'
import { createCampaign, getCampaignById, listCampaignsByLastPlayed } from '../db/repositories/campaigns'
import {
  duplicateCampaignById,
  exportCampaignWithDialog,
  importCampaignWithDialog
} from './campaignPortabilityIpc'

const noopAssets = {
  readAssetBytes: (): Buffer | null => null,
  writeAssetFile: (logicalPath: string): string => `/tmp/assets/${logicalPath}`
}

function seedNamedCampaign(name: string) {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name,
    premisePrompt: 'x',
    deathMode: 'legendary'
  })
  return { db, campaign }
}

describe('campaignPortabilityIpc export', () => {
  it('export writes a package via save dialog', async () => {
    const { db, campaign } = seedNamedCampaign('Export Me')
    const dest = join(mkdtempSync(join(tmpdir(), 'aittrpg-ipc-')), 'out.aittrpg')
    const result = await exportCampaignWithDialog(db, campaign.id, {
      showSaveDialog: async () => ({ canceled: false, filePath: dest }),
      showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
      appVersion: '1.2.3',
      ...noopAssets
    })
    expect(result).toEqual({ ok: true, campaignId: campaign.id, path: dest })
  })

  it('export canceled returns canceled result', async () => {
    const { db, campaign } = seedNamedCampaign('Cancel')
    const result = await exportCampaignWithDialog(db, campaign.id, {
      showSaveDialog: async () => ({ canceled: true, filePath: '' }),
      showOpenDialog: vi.fn(),
      appVersion: '1.2.3',
      ...noopAssets
    })
    expect(result).toEqual({ ok: false, canceled: true })
  })
})

describe('campaignPortabilityIpc import and duplicate', () => {
  it('import creates a new campaign id', async () => {
    const { db, campaign } = seedNamedCampaign('Import Me')
    const dest = join(mkdtempSync(join(tmpdir(), 'aittrpg-ipc-')), 'pkg.aittrpg')
    await exportCampaignWithDialog(db, campaign.id, {
      showSaveDialog: async () => ({ canceled: false, filePath: dest }),
      showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
      appVersion: '1.2.3',
      ...noopAssets
    })
    const imported = await importCampaignWithDialog(db, {
      showSaveDialog: async () => ({ canceled: true, filePath: '' }),
      showOpenDialog: async () => ({ canceled: false, filePaths: [dest] }),
      appVersion: '1.2.3',
      ...noopAssets
    })
    expect(imported.ok).toBe(true)
    if (!imported.ok) return
    expect(imported.campaignId).not.toBe(campaign.id)
    expect(getCampaignById(db, imported.campaignId)?.name).toBe('Import Me')
  })

  it('duplicate clones without a file dialog and isolates edits', () => {
    const { db, campaign } = seedNamedCampaign('Original')
    const duplicated = duplicateCampaignById(db, campaign.id, {
      appVersion: '1.2.3',
      ...noopAssets
    })
    expect(duplicated.ok).toBe(true)
    if (!duplicated.ok) return
    expect(duplicated.campaignId).not.toBe(campaign.id)
    db.prepare('UPDATE campaigns SET name = ? WHERE id = ?').run('Renamed clone', duplicated.campaignId)
    expect(getCampaignById(db, campaign.id)?.name).toBe('Original')
    expect(getCampaignById(db, duplicated.campaignId)?.name).toBe('Renamed clone')
    expect(listCampaignsByLastPlayed(db).length).toBe(2)
  })
})
