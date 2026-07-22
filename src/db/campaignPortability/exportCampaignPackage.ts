import { writeFileSync } from 'node:fs'
import Database from 'better-sqlite3'
import {
  CAMPAIGN_PACKAGE_FORMAT_VERSION,
  CAMPAIGN_PACKAGE_MAGIC,
  type CampaignExportResult,
  type PortableAssetRow,
  type PortableExportOptions
} from '../../shared/campaignPortability'
import { getCampaignById } from '../repositories/campaigns'
import { migrations } from '../schema'
import { runMigrations } from '../migrations'
import { ensurePackageTables, writePortableMeta } from './packageMeta'
import { selectCampaignRows, selectOptionalCampaignRows } from './selectCampaignRows'
import { copyRows, withForeignKeysOff } from './tableCopy'

export type ReadAssetFile = (absolutePath: string) => Buffer | null

export interface ExportCampaignPackageOptions extends PortableExportOptions {
  appVersion: string
  exportedAt?: string
  readAssetFile: ReadAssetFile
  assets?: PortableAssetRow[]
}

function schemaUserVersion(db: Database.Database): number {
  return db.pragma('user_version', { simple: true }) as number
}

function writeAssets(pkg: Database.Database, assets: PortableAssetRow[]): void {
  const insert = pkg.prepare(
    `INSERT INTO portable_assets (id, kind, logical_path, owner_entity_id, mime_type, bytes)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
  for (const asset of assets) {
    insert.run(
      asset.id,
      asset.kind,
      asset.logicalPath,
      asset.ownerEntityId,
      asset.mimeType,
      asset.bytes
    )
  }
}

function groupAssetsByOwner(assets: PortableAssetRow[]): Map<string, PortableAssetRow[]> {
  const byOwner = new Map<string, PortableAssetRow[]>()
  for (const asset of assets) {
    const list = byOwner.get(asset.ownerEntityId) ?? []
    list.push(asset)
    byOwner.set(asset.ownerEntityId, list)
  }
  return byOwner
}

function applyCharacterPathRewrites(
  rows: Record<string, unknown>[],
  byOwner: Map<string, PortableAssetRow[]>
): void {
  for (const row of rows) {
    for (const asset of byOwner.get(String(row.id)) ?? []) {
      if (asset.kind === 'portrait') row.portrait_path = asset.logicalPath
      if (asset.kind === 'sheet_background') row.sheet_background_path = asset.logicalPath
    }
  }
}

function applyNpcPathRewrites(
  rows: Record<string, unknown>[],
  byOwner: Map<string, PortableAssetRow[]>
): void {
  for (const row of rows) {
    for (const asset of byOwner.get(String(row.id)) ?? []) {
      if (asset.kind === 'npc_face_token') row.face_token_path = asset.logicalPath
    }
  }
}

function applyPathRewrites(
  rows: Map<string, Record<string, unknown>[]>,
  assets: PortableAssetRow[]
): void {
  const byOwner = groupAssetsByOwner(assets)
  applyCharacterPathRewrites(rows.get('characters') ?? [], byOwner)
  applyNpcPathRewrites(rows.get('npcs') ?? [], byOwner)
}

export function buildCampaignPackageDatabase(
  sourceDb: Database.Database,
  campaignId: string,
  options: ExportCampaignPackageOptions
): Database.Database | CampaignExportResult {
  if (!getCampaignById(sourceDb, campaignId)) {
    return { ok: false, code: 'not_found', message: 'Campaign not found.' }
  }

  const pkg = new Database(':memory:')
  runMigrations(pkg, migrations)
  ensurePackageTables(pkg)

  const rows = selectCampaignRows(sourceDb, campaignId)
  const optional = selectOptionalCampaignRows(sourceDb, campaignId, options)
  for (const [table, tableRows] of optional) {
    rows.set(table, tableRows)
  }

  const assets = options.assets ?? []
  applyPathRewrites(rows, assets)

  withForeignKeysOff(pkg, () => {
    for (const [table, tableRows] of rows) {
      copyRows(sourceDb, pkg, table, tableRows)
    }
  })

  writePortableMeta(pkg, {
    magic: CAMPAIGN_PACKAGE_MAGIC,
    formatVersion: CAMPAIGN_PACKAGE_FORMAT_VERSION,
    schemaUserVersion: schemaUserVersion(sourceDb),
    sourceCampaignId: campaignId,
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    includeLlmUsage: options.includeLlmUsage,
    includeRagChunks: options.includeRagChunks,
    appVersion: options.appVersion
  })
  writeAssets(pkg, assets)

  return pkg
}

export function exportCampaignToPackageFile(
  sourceDb: Database.Database,
  campaignId: string,
  destPath: string,
  options: ExportCampaignPackageOptions
): CampaignExportResult {
  const built = buildCampaignPackageDatabase(sourceDb, campaignId, options)
  if (!('serialize' in built)) {
    return built
  }

  try {
    const bytes = built.serialize()
    writeFileSync(destPath, bytes)
    built.close()
    return { ok: true, campaignId, path: destPath }
  } catch {
    built.close()
    return {
      ok: false,
      code: 'export_failed',
      message: 'Could not write the campaign package file.'
    }
  }
}
