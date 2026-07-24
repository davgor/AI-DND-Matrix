import { app } from 'electron'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import {
  getCharacterById,
  replaceCharacterPortraitWithUpload,
  type Character
} from '../db/repositories/characters'
import {
  createMockImageProvider,
  type ImageProvider
} from '../shared/imageGeneration'
import {
  generatePlayerCharacterIcon,
  hasPlayerIconAppearancePrompt,
  type PlayerCharacterIconGenerateRequest
} from '../shared/playerCharacterIcons'
import { getDb } from './db'
import { logger } from './logger'
import {
  persistPlayerCharacterIconAsset,
  writePlayerCharacterIconAsset
} from './playerCharacterIconAsset'
import { mergeSchedulerDeps } from './imageProviderResolve'
import { IMAGE_GENERATION_NOT_READY_MESSAGE } from '../shared/settings/imageProviderSettings'

const PLACEHOLDER_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

export interface GeneratePlayerCharacterIconInput {
  campaignId: string
  /** When set, successful generation updates portrait_path + portrait_prompt on the row. */
  characterId?: string
  name: string
  role: string
  appearancePrompt: string
  raceKey?: string | null
  genderKey?: string | null
  age?: string | null
  hairColor?: string | null
  eyeColor?: string | null
}

export type GeneratePlayerCharacterIconResult =
  | { ok: true; portraitPath: string; appearancePrompt: string }
  | { ok: false; message: string }

export interface ReplacePlayerCharacterPortraitInput {
  characterId: string
  portraitPath: string
}

interface PlayerCharacterIconIpcDeps {
  db: Database.Database
  imageProvider: ImageProvider
  imageProviderReady: boolean
  baseDir: string
}

function defaultBaseDir(): string {
  try {
    return app.getPath('userData')
  } catch {
    return join(tmpdir(), 'ai-ttrpg-player-icons')
  }
}

function defaultImageProvider(): ImageProvider {
  return createMockImageProvider({
    mode: 'success',
    mimeType: 'image/png',
    bytesBase64: PLACEHOLDER_PNG_BASE64
  })
}

export function createPlayerCharacterIconIpcDeps(
  db: Database.Database,
  overrides?: Partial<PlayerCharacterIconIpcDeps>
): PlayerCharacterIconIpcDeps {
  return mergeSchedulerDeps(overrides, defaultImageProvider(), {
    db,
    imageProvider: defaultImageProvider(),
    imageProviderReady: false,
    baseDir: defaultBaseDir()
  })
}

function buildRequest(input: GeneratePlayerCharacterIconInput): PlayerCharacterIconGenerateRequest {
  return {
    entityId: input.characterId ?? randomUUID(),
    campaignId: input.campaignId,
    appearancePrompt: input.appearancePrompt,
    identity: {
      name: input.name,
      role: input.role,
      raceKey: input.raceKey ?? null,
      genderKey: input.genderKey ?? null,
      age: input.age ?? null,
      hairColor: input.hairColor ?? null,
      eyeColor: input.eyeColor ?? null
    },
    styleContext: { presetId: null, notes: null }
  }
}

export async function generatePlayerCharacterIconJob(
  deps: PlayerCharacterIconIpcDeps,
  input: GeneratePlayerCharacterIconInput
): Promise<GeneratePlayerCharacterIconResult> {
  if (!deps.imageProviderReady) {
    return { ok: false, message: IMAGE_GENERATION_NOT_READY_MESSAGE }
  }
  if (!hasPlayerIconAppearancePrompt(input.appearancePrompt)) {
    return { ok: false, message: 'Appearance prompt is required.' }
  }
  const request = buildRequest(input)
  const result = await generatePlayerCharacterIcon(deps.imageProvider, request)
  if (!result.ok) {
    return { ok: false, message: result.message }
  }
  const entityId = request.entityId
  if (input.characterId) {
    const path = persistPlayerCharacterIconAsset(deps.db, {
      characterId: input.characterId,
      bytesBase64: result.bytesBase64,
      mimeType: result.mimeType,
      appearancePrompt: input.appearancePrompt.trim(),
      baseDir: deps.baseDir
    })
    if (!path) {
      return { ok: false, message: 'Failed to persist generated portrait.' }
    }
    return { ok: true, portraitPath: path, appearancePrompt: input.appearancePrompt.trim() }
  }
  const path = writePlayerCharacterIconAsset({
    baseDir: deps.baseDir,
    characterId: entityId,
    bytesBase64: result.bytesBase64,
    mimeType: result.mimeType
  })
  if (!path) {
    return { ok: false, message: 'Failed to write generated portrait.' }
  }
  return { ok: true, portraitPath: path, appearancePrompt: input.appearancePrompt.trim() }
}

export function replacePlayerCharacterPortrait(
  db: Database.Database,
  input: ReplacePlayerCharacterPortraitInput
): Character | undefined {
  replaceCharacterPortraitWithUpload(db, input.characterId, input.portraitPath)
  return getCharacterById(db, input.characterId)
}

export function registerPlayerCharacterIconHandlers(): void {
  ipcMain.handle(
    'characters:generatePlayerIcon',
    async (_event, input: GeneratePlayerCharacterIconInput) => {
      const deps = createPlayerCharacterIconIpcDeps(getDb())
      try {
        return await generatePlayerCharacterIconJob(deps, input)
      } catch (error: unknown) {
        logger.error('Player icon generation failed', error)
        return {
          ok: false as const,
          message: error instanceof Error ? error.message : 'Unknown generation error'
        }
      }
    }
  )
  ipcMain.handle(
    'characters:replacePlayerPortrait',
    (_event, input: ReplacePlayerCharacterPortraitInput) =>
      replacePlayerCharacterPortrait(getDb(), input)
  )
}
