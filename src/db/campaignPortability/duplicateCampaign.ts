import type Database from 'better-sqlite3'
import type { CampaignDuplicateResult } from '../../shared/campaignPortability'
import { getCampaignById } from '../repositories/campaigns'
import { buildCampaignPackageDatabase } from './exportCampaignPackage'
import { importCampaignFromPackageDb } from './importCampaignPackage'
import { collectCampaignPackageAssets } from './collectCampaignAssets'
import { PORTABLE_DEFAULT_OPTIONS } from '../../shared/campaignPortability'
import { readPortableMeta } from './packageMeta'

export type ReadAssetBytes = (absolutePath: string) => Buffer | null
export type WriteAssetFile = (logicalPath: string, bytes: Uint8Array, mimeType: string) => string

export interface DuplicateCampaignOptions {
  appVersion: string
  readAssetBytes: ReadAssetBytes
  writeAssetFile: WriteAssetFile
}

export function duplicateCampaignInPlace(
  db: Database.Database,
  campaignId: string,
  options: DuplicateCampaignOptions
): CampaignDuplicateResult {
  if (!getCampaignById(db, campaignId)) {
    return { ok: false, code: 'not_found', message: 'Campaign not found.' }
  }

  const assets = collectCampaignPackageAssets(db, campaignId, options.readAssetBytes)
  const built = buildCampaignPackageDatabase(db, campaignId, {
    ...PORTABLE_DEFAULT_OPTIONS,
    appVersion: options.appVersion,
    readAssetFile: options.readAssetBytes,
    assets
  })
  if (!('serialize' in built)) {
    return {
      ok: false,
      code: 'duplicate_failed',
      message: 'Could not duplicate the campaign.'
    }
  }

  try {
    const meta = readPortableMeta(built)
    if (!meta) {
      built.close()
      return { ok: false, code: 'duplicate_failed', message: 'Could not duplicate the campaign.' }
    }
    const result = importCampaignFromPackageDb({
      liveDb: db,
      pkg: built,
      sourceCampaignId: meta.sourceCampaignId,
      includeLlmUsage: meta.includeLlmUsage,
      includeRagChunks: meta.includeRagChunks,
      options: { writeAssetFile: options.writeAssetFile }
    })
    built.close()
    if (!result.ok) {
      return {
        ok: false,
        code: 'duplicate_failed',
        message: 'message' in result ? result.message : 'Could not duplicate the campaign.'
      }
    }
    return { ok: true, campaignId: result.campaignId }
  } catch {
    built.close()
    return { ok: false, code: 'duplicate_failed', message: 'Could not duplicate the campaign.' }
  }
}
