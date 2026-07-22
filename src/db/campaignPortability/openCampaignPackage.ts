import Database from 'better-sqlite3'
import { readFileSync } from 'node:fs'
import {
  CAMPAIGN_PACKAGE_FORMAT_VERSION,
  CAMPAIGN_PACKAGE_MAGIC,
  type CampaignPortabilityFailure,
  type PortableMetaRow
} from '../../shared/campaignPortability'
import { migrations } from '../schema'
import { runMigrations } from '../migrations'
import { ensurePackageTables, readPortableMeta } from './packageMeta'

export type OpenPackageSuccess = {
  ok: true
  db: Database.Database
  meta: PortableMetaRow
}

export type OpenPackageResult = OpenPackageSuccess | CampaignPortabilityFailure

function unsupportedVersion(message: string): CampaignPortabilityFailure {
  return { ok: false, code: 'unsupported_version', message }
}

function validateMeta(meta: PortableMetaRow | null): CampaignPortabilityFailure | null {
  if (!meta || meta.magic !== CAMPAIGN_PACKAGE_MAGIC) {
    return { ok: false, code: 'invalid_package', message: 'Not a valid campaign package.' }
  }
  if (meta.formatVersion > CAMPAIGN_PACKAGE_FORMAT_VERSION) {
    return unsupportedVersion(
      `Package format ${meta.formatVersion} is newer than this app supports.`
    )
  }
  const tipVersion = Math.max(...migrations.map((migration) => migration.version))
  if (meta.schemaUserVersion > tipVersion) {
    return unsupportedVersion(
      `Package schema version ${meta.schemaUserVersion} is newer than this app supports.`
    )
  }
  return null
}

export function openCampaignPackage(filePath: string): OpenPackageResult {
  let bytes: Buffer
  try {
    bytes = readFileSync(filePath)
  } catch {
    return { ok: false, code: 'io_error', message: 'Could not read the campaign package file.' }
  }

  if (bytes.length < 16 || bytes.subarray(0, 6).toString('utf8') !== 'SQLite') {
    return { ok: false, code: 'corrupt_package', message: 'File is not a valid campaign package.' }
  }

  let db: Database.Database
  try {
    db = new Database(bytes)
  } catch {
    return { ok: false, code: 'corrupt_package', message: 'File is not a valid campaign package.' }
  }

  try {
    runMigrations(db, migrations)
    ensurePackageTables(db)
    const meta = readPortableMeta(db)
    const error = validateMeta(meta)
    if (error || !meta) {
      db.close()
      return error ?? { ok: false, code: 'invalid_package', message: 'Not a valid campaign package.' }
    }
    return { ok: true, db, meta }
  } catch {
    db.close()
    return { ok: false, code: 'corrupt_package', message: 'File is not a valid campaign package.' }
  }
}
