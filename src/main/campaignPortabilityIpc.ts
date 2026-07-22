import { app, dialog, ipcMain } from 'electron'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type Database from 'better-sqlite3'
import {
  PORTABLE_DEFAULT_OPTIONS,
  type CampaignDuplicateResult,
  type CampaignExportResult,
  type CampaignImportResult
} from '../shared/campaignPortability'
import { formatCampaignPackageFilename } from '../shared/campaignPortability/filename'
import { getCampaignById } from '../db/repositories/campaigns'
import { exportCampaignToPackageFile } from '../db/campaignPortability/exportCampaignPackage'
import { importCampaignFromPackageFile } from '../db/campaignPortability/importCampaignPackage'
import { duplicateCampaignInPlace } from '../db/campaignPortability/duplicateCampaign'
import { collectCampaignPackageAssets } from '../db/campaignPortability/collectCampaignAssets'
import { getDb } from './db'

export type ShowSaveDialog = typeof dialog.showSaveDialog
export type ShowOpenDialog = typeof dialog.showOpenDialog
export type ReadAssetBytes = (absolutePath: string) => Buffer | null
export type WriteAssetFile = (logicalPath: string, bytes: Uint8Array, mimeType: string) => string

function defaultReadAssetBytes(absolutePath: string): Buffer | null {
  try {
    return readFileSync(absolutePath)
  } catch {
    return null
  }
}

function defaultWriteAssetFile(logicalPath: string, bytes: Uint8Array): string {
  const absolute = join(app.getPath('userData'), logicalPath)
  mkdirSync(dirname(absolute), { recursive: true })
  writeFileSync(absolute, bytes)
  return absolute
}

export interface CampaignPortabilityDialogDeps {
  showSaveDialog: ShowSaveDialog
  showOpenDialog: ShowOpenDialog
  appVersion: string
  readAssetBytes?: ReadAssetBytes
  writeAssetFile?: WriteAssetFile
}

function resolveRead(deps: CampaignPortabilityDialogDeps): ReadAssetBytes {
  return deps.readAssetBytes ?? defaultReadAssetBytes
}

function resolveWrite(deps: Pick<CampaignPortabilityDialogDeps, 'writeAssetFile'>): WriteAssetFile {
  return (
    deps.writeAssetFile ??
    ((logicalPath, bytes, _mime) => defaultWriteAssetFile(logicalPath, bytes))
  )
}

export async function exportCampaignWithDialog(
  db: Database.Database,
  campaignId: string,
  deps: CampaignPortabilityDialogDeps
): Promise<CampaignExportResult> {
  const campaign = getCampaignById(db, campaignId)
  if (!campaign) {
    return { ok: false, code: 'not_found', message: 'Campaign not found.' }
  }

  const dialogResult = await deps.showSaveDialog({
    title: 'Export campaign',
    defaultPath: formatCampaignPackageFilename(campaign.name),
    filters: [{ name: 'Campaign package', extensions: ['aittrpg'] }]
  })
  if (dialogResult.canceled || !dialogResult.filePath) {
    return { ok: false, canceled: true }
  }

  const readAssetBytes = resolveRead(deps)
  const assets = collectCampaignPackageAssets(db, campaignId, readAssetBytes)
  return exportCampaignToPackageFile(db, campaignId, dialogResult.filePath, {
    ...PORTABLE_DEFAULT_OPTIONS,
    appVersion: deps.appVersion,
    readAssetFile: readAssetBytes,
    assets
  })
}

export async function importCampaignWithDialog(
  db: Database.Database,
  deps: CampaignPortabilityDialogDeps
): Promise<CampaignImportResult> {
  const dialogResult = await deps.showOpenDialog({
    title: 'Import campaign',
    properties: ['openFile'],
    filters: [{ name: 'Campaign package', extensions: ['aittrpg'] }]
  })
  if (dialogResult.canceled || !dialogResult.filePaths[0]) {
    return { ok: false, canceled: true }
  }

  return importCampaignFromPackageFile(db, dialogResult.filePaths[0], {
    writeAssetFile: resolveWrite(deps)
  })
}

export function duplicateCampaignById(
  db: Database.Database,
  campaignId: string,
  deps: Pick<CampaignPortabilityDialogDeps, 'appVersion' | 'readAssetBytes' | 'writeAssetFile'>
): CampaignDuplicateResult {
  return duplicateCampaignInPlace(db, campaignId, {
    appVersion: deps.appVersion,
    readAssetBytes: deps.readAssetBytes ?? defaultReadAssetBytes,
    writeAssetFile: resolveWrite(deps)
  })
}

export function registerCampaignPortabilityHandlers(): void {
  const deps = (): CampaignPortabilityDialogDeps => ({
    showSaveDialog: dialog.showSaveDialog,
    showOpenDialog: dialog.showOpenDialog,
    appVersion: app.getVersion()
  })

  ipcMain.handle('campaigns:export', (_event, campaignId: unknown): Promise<CampaignExportResult> => {
    if (typeof campaignId !== 'string' || !campaignId.trim()) {
      return Promise.resolve({
        ok: false,
        code: 'not_found',
        message: 'Campaign not found.'
      })
    }
    return exportCampaignWithDialog(getDb(), campaignId.trim(), deps())
  })

  ipcMain.handle('campaigns:import', (): Promise<CampaignImportResult> => {
    return importCampaignWithDialog(getDb(), deps())
  })

  ipcMain.handle(
    'campaigns:duplicate',
    (_event, campaignId: unknown): Promise<CampaignDuplicateResult> => {
      if (typeof campaignId !== 'string' || !campaignId.trim()) {
        return Promise.resolve({
          ok: false,
          code: 'not_found',
          message: 'Campaign not found.'
        })
      }
      return Promise.resolve(duplicateCampaignById(getDb(), campaignId.trim(), deps()))
    }
  )
}
