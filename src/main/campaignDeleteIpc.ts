import { ipcMain } from 'electron'
import { unlinkSync } from 'node:fs'
import type Database from 'better-sqlite3'
import { deleteCampaignCascade } from '../db/repositories/deleteCampaign'
import { getCampaignById } from '../db/repositories/campaigns'
import { listCharactersByCampaign } from '../db/repositories/characters'
import type { DeleteCampaignResult } from '../shared/campaignDelete/types'
import { collectCharacterUploadPaths, deleteUploadFiles } from './campaignFileCleanup'
import { getDb } from './db'

type UnlinkFile = (path: string) => void

export async function deleteCampaignById(
  db: Database.Database,
  campaignId: string,
  unlinkFile: UnlinkFile = unlinkSync
): Promise<DeleteCampaignResult> {
  if (!getCampaignById(db, campaignId)) {
    return { ok: false, code: 'not_found', message: 'Campaign not found.' }
  }

  const uploadPaths = collectCharacterUploadPaths(listCharactersByCampaign(db, campaignId))

  try {
    deleteCampaignCascade(db, campaignId)
    deleteUploadFiles(uploadPaths, unlinkFile)
    return { ok: true }
  } catch {
    return {
      ok: false,
      code: 'delete_failed',
      message: 'Could not delete the campaign. Try again.'
    }
  }
}

export function registerCampaignDeleteHandlers(): void {
  ipcMain.handle('campaigns:delete', (_event, campaignId: unknown): Promise<DeleteCampaignResult> => {
    if (typeof campaignId !== 'string' || !campaignId.trim()) {
      return Promise.resolve({
        ok: false,
        code: 'not_found',
        message: 'Campaign not found.'
      })
    }
    return deleteCampaignById(getDb(), campaignId.trim())
  })
}
