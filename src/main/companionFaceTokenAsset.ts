import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type Database from 'better-sqlite3'
import { updateCharacterPortraitPath } from '../db/repositories/characters'
import {
  mimeTypeToExtension,
  resolveNpcFaceTokenPath
} from './npcFaceTokenAsset'

export const COMPANION_FACE_TOKEN_SUBFOLDER = 'companion-face-tokens'

export function buildCompanionFaceTokenFilePath(
  baseDir: string,
  campaignId: string,
  companionId: string,
  mimeType: string
): string | null {
  const extension = mimeTypeToExtension(mimeType)
  if (!extension) {
    return null
  }
  return join(baseDir, COMPANION_FACE_TOKEN_SUBFOLDER, campaignId, `${companionId}${extension}`)
}

export interface WriteCompanionFaceTokenAssetInput {
  baseDir: string
  campaignId: string
  companionId: string
  bytesBase64: string
  mimeType: string
}

export function writeCompanionFaceTokenAsset(
  input: WriteCompanionFaceTokenAssetInput
): string | null {
  const filePath = buildCompanionFaceTokenFilePath(
    input.baseDir,
    input.campaignId,
    input.companionId,
    input.mimeType
  )
  if (!filePath) {
    return null
  }
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, Buffer.from(input.bytesBase64, 'base64'))
  return filePath
}

/** Reuse NPC path existence check for companion portrait/face-token files. */
export function resolveCompanionFaceTokenPath(storedPath: string | null): string | null {
  return resolveNpcFaceTokenPath(storedPath)
}

export interface PersistCompanionFaceTokenAssetInput {
  companionId: string
  campaignId: string
  bytesBase64: string
  mimeType: string
  baseDir: string
}

export function persistCompanionFaceTokenAsset(
  db: Database.Database,
  input: PersistCompanionFaceTokenAssetInput
): string | null {
  const filePath = writeCompanionFaceTokenAsset({
    baseDir: input.baseDir,
    campaignId: input.campaignId,
    companionId: input.companionId,
    bytesBase64: input.bytesBase64,
    mimeType: input.mimeType
  })
  if (!filePath) {
    return null
  }
  updateCharacterPortraitPath(db, input.companionId, filePath)
  return filePath
}
