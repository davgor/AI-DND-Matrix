import type Database from 'better-sqlite3'
import {
  type CampaignImportResult,
  type PortableAssetRow
} from '../../shared/campaignPortability'
import { openCampaignPackage } from './openCampaignPackage'
import { selectCampaignRows, selectOptionalCampaignRows } from './selectCampaignRows'
import { buildIdRemap, remapTableRows } from './idRemap'
import { copyRows, selectAllRows, withForeignKeysOff } from './tableCopy'

export type WriteAssetFile = (logicalPath: string, bytes: Uint8Array, mimeType: string) => string

export interface ImportCampaignPackageOptions {
  writeAssetFile: WriteAssetFile
}

export interface ImportFromPackageDbInput {
  liveDb: Database.Database
  pkg: Database.Database
  sourceCampaignId: string
  includeLlmUsage: boolean
  includeRagChunks: boolean
  options: ImportCampaignPackageOptions
}

const INSERT_TABLE_ORDER = [
  'items',
  'campaigns',
  'regions',
  'deities',
  'campaign_races',
  'factions',
  'faction_relations',
  'npcs',
  'characters',
  'region_history',
  'npc_memories',
  'character_items',
  'character_item_modifications',
  'character_quests',
  'character_faction_reputations',
  'character_journal_entries',
  'guided_creation_messages',
  'ask_dm_messages',
  'log_entries',
  'saves',
  'world_facts',
  'story_threads',
  'events',
  'sessions',
  'combat_encounters',
  'bestiary_species',
  'bestiary_variants',
  'quests',
  'quest_foe_assignments',
  'llm_usage_events',
  'rag_chunks',
  'rag_backfill_state'
] as const

function loadPackageRows(
  pkg: Database.Database,
  sourceCampaignId: string,
  includeLlmUsage: boolean,
  includeRagChunks: boolean
): Map<string, Record<string, unknown>[]> {
  const rows = selectCampaignRows(pkg, sourceCampaignId)
  const optional = selectOptionalCampaignRows(pkg, sourceCampaignId, {
    includeLlmUsage,
    includeRagChunks
  })
  for (const [table, tableRows] of optional) {
    rows.set(table, tableRows)
  }
  return rows
}

function readPackageAssets(pkg: Database.Database): PortableAssetRow[] {
  const rows = selectAllRows(pkg, 'portable_assets')
  return rows.map((row) => ({
    id: String(row.id),
    kind: row.kind as PortableAssetRow['kind'],
    logicalPath: String(row.logical_path),
    ownerEntityId: String(row.owner_entity_id),
    mimeType: String(row.mime_type),
    bytes: row.bytes as Uint8Array
  }))
}

function materializeAssets(
  assets: PortableAssetRow[],
  writeAssetFile: WriteAssetFile
): Map<string, string> {
  const logicalToAbsolute = new Map<string, string>()
  for (const asset of assets) {
    logicalToAbsolute.set(
      asset.logicalPath,
      writeAssetFile(asset.logicalPath, asset.bytes, asset.mimeType)
    )
  }
  return logicalToAbsolute
}

function applyAbsolutePath(
  row: Record<string, unknown>,
  column: string,
  logicalToAbsolute: Map<string, string>
): void {
  const value = row[column]
  if (typeof value === 'string' && logicalToAbsolute.has(value)) {
    row[column] = logicalToAbsolute.get(value)
  }
}

function rewriteAssetPaths(
  rows: Map<string, Record<string, unknown>[]>,
  assets: PortableAssetRow[],
  writeAssetFile: WriteAssetFile
): void {
  const logicalToAbsolute = materializeAssets(assets, writeAssetFile)
  for (const row of rows.get('characters') ?? []) {
    applyAbsolutePath(row, 'portrait_path', logicalToAbsolute)
    applyAbsolutePath(row, 'sheet_background_path', logicalToAbsolute)
  }
  for (const row of rows.get('npcs') ?? []) {
    applyAbsolutePath(row, 'face_token_path', logicalToAbsolute)
  }
}

function insertRemappedRows(
  liveDb: Database.Database,
  remapped: Map<string, Record<string, unknown>[]>
): string {
  const campaigns = remapped.get('campaigns') ?? []
  const newId = String(campaigns[0]?.id)
  withForeignKeysOff(liveDb, () => {
    for (const table of INSERT_TABLE_ORDER) {
      const tableRows = remapped.get(table)
      if (tableRows) copyRows(liveDb, liveDb, table, tableRows)
    }
  })
  return newId
}

export function importCampaignFromPackageDb(input: ImportFromPackageDbInput): CampaignImportResult {
  try {
    const rows = loadPackageRows(
      input.pkg,
      input.sourceCampaignId,
      input.includeLlmUsage,
      input.includeRagChunks
    )
    if ((rows.get('campaigns') ?? []).length === 0) {
      return { ok: false, code: 'invalid_package', message: 'Package has no campaign row.' }
    }
    const idRemap = buildIdRemap(rows)
    const remapped = remapTableRows(rows, idRemap)
    const assets = readPackageAssets(input.pkg).map((asset) => ({
      ...asset,
      ownerEntityId: idRemap.get(asset.ownerEntityId) ?? asset.ownerEntityId
    }))
    rewriteAssetPaths(remapped, assets, input.options.writeAssetFile)
    return { ok: true, campaignId: insertRemappedRows(input.liveDb, remapped) }
  } catch {
    return {
      ok: false,
      code: 'import_failed',
      message: 'Could not import the campaign package.'
    }
  }
}

export function importCampaignFromPackageFile(
  liveDb: Database.Database,
  filePath: string,
  options: ImportCampaignPackageOptions
): CampaignImportResult {
  const opened = openCampaignPackage(filePath)
  if (!opened.ok) return opened

  try {
    return importCampaignFromPackageDb({
      liveDb,
      pkg: opened.db,
      sourceCampaignId: opened.meta.sourceCampaignId,
      includeLlmUsage: opened.meta.includeLlmUsage,
      includeRagChunks: opened.meta.includeRagChunks,
      options
    })
  } finally {
    opened.db.close()
  }
}
