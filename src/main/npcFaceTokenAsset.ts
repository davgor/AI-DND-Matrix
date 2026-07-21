import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type Database from 'better-sqlite3'
import { updateNpcFaceTokenPath } from '../db/repositories/npcs'

export const NPC_FACE_TOKEN_SUBFOLDER = 'npc-face-tokens'

const MIME_EXTENSION: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp'
}

export function mimeTypeToExtension(mimeType: string): string | null {
  return MIME_EXTENSION[mimeType] ?? null
}

export function buildNpcFaceTokenFilePath(
  baseDir: string,
  campaignId: string,
  npcId: string,
  mimeType: string
): string | null {
  const extension = mimeTypeToExtension(mimeType)
  if (!extension) {
    return null
  }
  return join(baseDir, NPC_FACE_TOKEN_SUBFOLDER, campaignId, `${npcId}${extension}`)
}

export interface WriteNpcFaceTokenAssetInput {
  baseDir: string
  campaignId: string
  npcId: string
  bytesBase64: string
  mimeType: string
}

export function writeNpcFaceTokenAsset(input: WriteNpcFaceTokenAssetInput): string | null {
  const filePath = buildNpcFaceTokenFilePath(
    input.baseDir,
    input.campaignId,
    input.npcId,
    input.mimeType
  )
  if (!filePath) {
    return null
  }
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, Buffer.from(input.bytesBase64, 'base64'))
  return filePath
}

export function resolveNpcFaceTokenPath(storedPath: string | null): string | null {
  if (!storedPath) {
    return null
  }
  try {
    return existsSync(storedPath) ? storedPath : null
  } catch {
    return null
  }
}

export interface PersistNpcFaceTokenAssetInput {
  npcId: string
  campaignId: string
  bytesBase64: string
  mimeType: string
  baseDir: string
}

export function persistNpcFaceTokenAsset(
  db: Database.Database,
  input: PersistNpcFaceTokenAssetInput
): string | null {
  const filePath = writeNpcFaceTokenAsset({
    baseDir: input.baseDir,
    campaignId: input.campaignId,
    npcId: input.npcId,
    bytesBase64: input.bytesBase64,
    mimeType: input.mimeType
  })
  if (!filePath) {
    return null
  }
  updateNpcFaceTokenPath(db, input.npcId, filePath)
  return filePath
}
