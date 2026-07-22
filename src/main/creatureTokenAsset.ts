import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type Database from 'better-sqlite3'
import { updateBestiarySpeciesCreatureTokenPath } from '../db/repositories/bestiary'

export const CREATURE_TOKEN_SUBFOLDER = 'creature-tokens'

const MIME_EXTENSION: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp'
}

export function mimeTypeToExtension(mimeType: string): string | null {
  return MIME_EXTENSION[mimeType] ?? null
}

export function buildCreatureTokenFilePath(
  baseDir: string,
  campaignId: string,
  speciesId: string,
  mimeType: string
): string | null {
  const extension = mimeTypeToExtension(mimeType)
  if (!extension) {
    return null
  }
  return join(baseDir, CREATURE_TOKEN_SUBFOLDER, campaignId, `${speciesId}${extension}`)
}

export interface WriteCreatureTokenAssetInput {
  baseDir: string
  campaignId: string
  speciesId: string
  bytesBase64: string
  mimeType: string
}

export function writeCreatureTokenAsset(input: WriteCreatureTokenAssetInput): string | null {
  const filePath = buildCreatureTokenFilePath(
    input.baseDir,
    input.campaignId,
    input.speciesId,
    input.mimeType
  )
  if (!filePath) {
    return null
  }
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, Buffer.from(input.bytesBase64, 'base64'))
  return filePath
}

export function resolveCreatureTokenPath(storedPath: string | null): string | null {
  if (!storedPath) {
    return null
  }
  try {
    return existsSync(storedPath) ? storedPath : null
  } catch {
    return null
  }
}

export interface PersistCreatureTokenAssetInput {
  speciesId: string
  campaignId: string
  bytesBase64: string
  mimeType: string
  baseDir: string
}

export function persistCreatureTokenAsset(
  db: Database.Database,
  input: PersistCreatureTokenAssetInput
): string | null {
  const filePath = writeCreatureTokenAsset({
    baseDir: input.baseDir,
    campaignId: input.campaignId,
    speciesId: input.speciesId,
    bytesBase64: input.bytesBase64,
    mimeType: input.mimeType
  })
  if (!filePath) {
    return null
  }
  updateBestiarySpeciesCreatureTokenPath(db, input.speciesId, filePath)
  return filePath
}
