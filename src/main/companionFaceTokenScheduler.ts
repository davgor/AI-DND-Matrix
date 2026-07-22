import { app } from 'electron'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { getCampaignById, type Campaign } from '../db/repositories/campaigns'
import { getCharacterById, type Character } from '../db/repositories/characters'
import type { ImageGenerateRequest, ImageProvider } from '../shared/imageGeneration'
import { generateNpcFaceToken } from '../shared/npcFaceTokens'
import {
  COMPANION_FACE_TOKEN_ENTITY_KIND,
  isCompanionAppearanceTraits,
  shouldEnqueueCompanionFaceToken,
  type CompanionAppearanceTraits
} from '../shared/partyMembers/types'
import { persistCompanionFaceTokenAsset } from './companionFaceTokenAsset'
import { logger } from './logger'

export interface CompanionFaceTokenSchedulerLogger {
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
}

export interface CompanionFaceTokenSchedulerDeps {
  db: Database.Database
  getCampaign: (campaignId: string) => Campaign | undefined
  getCompanion: (companionId: string) => Character | undefined
  imageProvider: ImageProvider
  baseDir: string
  logger: CompanionFaceTokenSchedulerLogger
}

export interface EnqueueCompanionFaceTokenJobInput {
  campaignId: string
  companionId: string
}

export type EnqueueCompanionFaceTokenJobResult = 'enqueued' | 'skipped'

/** 1×1 PNG — v1 default so toggle ON persists a real asset without cloud/llamacpp. */
const PLACEHOLDER_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const mockPlaceholderImageProvider: ImageProvider = {
  async generateImage(request) {
    return {
      ok: true,
      mimeType: 'image/png',
      bytesBase64: PLACEHOLDER_PNG_BASE64,
      prompt: request.prompt ?? ''
    }
  }
}

function readCompanionAppearance(companion: Character): CompanionAppearanceTraits {
  const stats = companion.stats as Record<string, unknown>
  const raw = stats['appearance']
  if (isCompanionAppearanceTraits(raw)) {
    return raw
  }
  return { hairColor: null, age: null, eyeColor: null }
}

function readCompanionRole(companion: Character): string {
  const stats = companion.stats as Record<string, unknown>
  const role = stats['companionRole']
  if (typeof role === 'string' && role.trim().length > 0) {
    return role.trim()
  }
  return companion.characterClass
}

export function buildCompanionFaceTokenImageRequest(
  companion: Character,
  campaignId: string
): ImageGenerateRequest {
  const appearance = readCompanionAppearance(companion)
  const identity = {
    name: companion.name,
    role: readCompanionRole(companion),
    raceKey: companion.raceKey,
    genderKey: null as string | null,
    age: appearance.age,
    hairColor: appearance.hairColor,
    eyeColor: appearance.eyeColor
  }
  const request: ImageGenerateRequest = {
    entityKind: COMPANION_FACE_TOKEN_ENTITY_KIND,
    entityId: companion.id,
    campaignId,
    identity,
    styleContext: { presetId: null, notes: null }
  }
  return {
    ...request,
    prompt: buildCompanionFaceTokenPrompt(request)
  }
}

function buildCompanionFaceTokenPrompt(request: ImageGenerateRequest): string {
  const { identity, styleContext } = request
  const lines = [
    'Generate a face-token portrait for a fantasy TTRPG AI party companion.',
    'Framing: head-and-shoulders close portrait suitable for a circular Social avatar.',
    'Do not generate a full-body figure, combat token, or battle-map miniature. Not full-body.',
    `Entity kind: ${COMPANION_FACE_TOKEN_ENTITY_KIND}.`,
    `Name: ${identity.name}.`,
    `Role: ${identity.role}.`,
    identity.raceKey ? `Race: ${identity.raceKey}.` : null,
    identity.age ? `Age: ${identity.age}.` : null,
    identity.hairColor ? `Hair color: ${identity.hairColor}.` : null,
    identity.eyeColor ? `Eye color: ${identity.eyeColor}.` : null,
    styleContext.presetId ? `Style preset: ${styleContext.presetId}.` : null,
    styleContext.notes ? `Style notes: ${styleContext.notes}.` : null
  ]
  return lines.filter((line): line is string => line !== null).join('\n')
}

function shouldScheduleCompanionFaceToken(
  deps: CompanionFaceTokenSchedulerDeps,
  input: EnqueueCompanionFaceTokenJobInput
): boolean {
  const campaign = deps.getCampaign(input.campaignId)
  const companion = deps.getCompanion(input.companionId)
  if (!campaign || !companion || companion.kind !== 'ai_party_member') {
    return false
  }
  return shouldEnqueueCompanionFaceToken(campaign.generativeTokensEnabled === true, {
    hasFaceToken: companion.portraitPath != null
  })
}

async function runCompanionFaceTokenJob(
  deps: CompanionFaceTokenSchedulerDeps,
  input: EnqueueCompanionFaceTokenJobInput
): Promise<void> {
  const companion = deps.getCompanion(input.companionId)
  if (!companion) {
    return
  }
  const result = await generateNpcFaceToken(
    deps.imageProvider,
    buildCompanionFaceTokenImageRequest(companion, input.campaignId)
  )
  if (!result.ok) {
    deps.logger.warn(
      `Companion face-token generation failed for ${input.companionId}: ${result.message}`
    )
    return
  }
  const path = persistCompanionFaceTokenAsset(deps.db, {
    companionId: input.companionId,
    campaignId: input.campaignId,
    bytesBase64: result.bytesBase64,
    mimeType: result.mimeType,
    baseDir: deps.baseDir
  })
  if (!path) {
    deps.logger.warn(`Companion face-token persist failed for ${input.companionId}`)
  }
}

export function enqueueCompanionFaceTokenJob(
  deps: CompanionFaceTokenSchedulerDeps,
  input: EnqueueCompanionFaceTokenJobInput
): EnqueueCompanionFaceTokenJobResult {
  if (!shouldScheduleCompanionFaceToken(deps, input)) {
    return 'skipped'
  }
  void runCompanionFaceTokenJob(deps, input).catch((error: unknown) => {
    deps.logger.error(`Companion face-token job failed for ${input.companionId}`, error)
  })
  return 'enqueued'
}

export function maybeEnqueueCompanionFaceTokenAfterAccept(
  deps: CompanionFaceTokenSchedulerDeps,
  campaignId: string,
  companionId: string
): EnqueueCompanionFaceTokenJobResult {
  return enqueueCompanionFaceTokenJob(deps, { campaignId, companionId })
}

export function createCompanionFaceTokenSchedulerDeps(
  db: Database.Database,
  overrides?: Partial<CompanionFaceTokenSchedulerDeps>
): CompanionFaceTokenSchedulerDeps {
  const merged: CompanionFaceTokenSchedulerDeps = {
    db,
    getCampaign: (id) => getCampaignById(db, id),
    getCompanion: (id) => getCharacterById(db, id),
    imageProvider: mockPlaceholderImageProvider,
    baseDir: '',
    logger,
    ...overrides
  }
  if (!merged.baseDir) {
    merged.baseDir = resolveDefaultCompanionFaceTokenBaseDir()
  }
  return merged
}

function resolveDefaultCompanionFaceTokenBaseDir(): string {
  try {
    return app.getPath('userData')
  } catch {
    return join(tmpdir(), 'ai-ttrpg-companion-face-tokens')
  }
}
