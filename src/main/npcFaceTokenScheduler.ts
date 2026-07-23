import { app } from 'electron'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { getCampaignById, type Campaign } from '../db/repositories/campaigns'
import { getNpcById, type Npc } from '../db/repositories/npcs'
import type { ImageGenerateRequest, ImageProvider } from '../shared/imageGeneration'
import {
  generateNpcFaceToken,
  NPC_FACE_TOKEN_ENTITY_KIND,
  shouldEnqueueNpcFaceToken
} from '../shared/npcFaceTokens'
import { persistNpcFaceTokenAsset } from './npcFaceTokenAsset'
import { mergeSchedulerDeps } from './imageProviderResolve'
import { logger } from './logger'

interface NpcFaceTokenSchedulerLogger {
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
}

export interface NpcFaceTokenSchedulerDeps {
  db: Database.Database
  getCampaign: (campaignId: string) => Campaign | undefined
  getNpc: (npcId: string) => Npc | undefined
  imageProvider: ImageProvider
  imageProviderReady: boolean
  baseDir: string
  logger: NpcFaceTokenSchedulerLogger
}

interface EnqueueNpcFaceTokenJobInput {
  campaignId: string
  npcId: string
}

type EnqueueNpcFaceTokenJobResult = 'enqueued' | 'skipped'

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

export function buildNpcFaceTokenImageRequest(npc: Npc, campaignId: string): ImageGenerateRequest {
  return {
    entityKind: NPC_FACE_TOKEN_ENTITY_KIND,
    entityId: npc.id,
    campaignId,
    identity: {
      name: npc.name,
      role: npc.role,
      raceKey: npc.raceKey,
      genderKey: npc.genderKey,
      age: npc.age,
      hairColor: npc.hairColor,
      eyeColor: npc.eyeColor
    },
    styleContext: { presetId: null, notes: null }
  }
}

function npcFaceTokenEligibility(npc: Npc) {
  return {
    canSpeak: npc.canSpeak,
    hasFaceToken: npc.faceTokenPath != null
  }
}

function shouldScheduleNpcFaceToken(
  deps: NpcFaceTokenSchedulerDeps,
  input: EnqueueNpcFaceTokenJobInput
): boolean {
  if (!deps.imageProviderReady) {
    return false
  }
  const campaign = deps.getCampaign(input.campaignId)
  const npc = deps.getNpc(input.npcId)
  if (!campaign || !npc) {
    return false
  }
  return shouldEnqueueNpcFaceToken(
    campaign.generativeTokensEnabled === true,
    npcFaceTokenEligibility(npc)
  )
}

async function runNpcFaceTokenJob(
  deps: NpcFaceTokenSchedulerDeps,
  input: EnqueueNpcFaceTokenJobInput
): Promise<void> {
  const npc = deps.getNpc(input.npcId)
  if (!npc) {
    return
  }
  const result = await generateNpcFaceToken(
    deps.imageProvider,
    buildNpcFaceTokenImageRequest(npc, input.campaignId)
  )
  if (!result.ok) {
    deps.logger.warn(
      `NPC face-token generation failed for ${input.npcId}: ${result.message}`
    )
    return
  }
  const path = persistNpcFaceTokenAsset(deps.db, {
    npcId: input.npcId,
    campaignId: input.campaignId,
    bytesBase64: result.bytesBase64,
    mimeType: result.mimeType,
    baseDir: deps.baseDir
  })
  if (!path) {
    deps.logger.warn(`NPC face-token persist failed for ${input.npcId}`)
  }
}

export function enqueueNpcFaceTokenJob(
  deps: NpcFaceTokenSchedulerDeps,
  input: EnqueueNpcFaceTokenJobInput
): EnqueueNpcFaceTokenJobResult {
  if (!shouldScheduleNpcFaceToken(deps, input)) {
    return 'skipped'
  }
  void runNpcFaceTokenJob(deps, input).catch((error: unknown) => {
    deps.logger.error(`NPC face-token job failed for ${input.npcId}`, error)
  })
  return 'enqueued'
}

export function maybeEnqueueNpcFaceTokenAfterCreate(
  deps: NpcFaceTokenSchedulerDeps,
  campaignId: string,
  npcId: string
): EnqueueNpcFaceTokenJobResult {
  return enqueueNpcFaceTokenJob(deps, { campaignId, npcId })
}

export function maybeEnqueueNpcFaceTokensForNpcs(
  deps: NpcFaceTokenSchedulerDeps,
  campaignId: string,
  npcs: Npc[]
): void {
  for (const npc of npcs) {
    if (npc.canSpeak) {
      enqueueNpcFaceTokenJob(deps, { campaignId, npcId: npc.id })
    }
  }
}

export function createNpcFaceTokenSchedulerDeps(
  db: Database.Database,
  overrides?: Partial<NpcFaceTokenSchedulerDeps>
): NpcFaceTokenSchedulerDeps {
  return mergeSchedulerDeps(overrides, mockPlaceholderImageProvider, {
    db,
    getCampaign: (id) => getCampaignById(db, id),
    getNpc: (id) => getNpcById(db, id),
    imageProvider: mockPlaceholderImageProvider,
    imageProviderReady: false,
    baseDir: resolveDefaultFaceTokenBaseDir(),
    logger
  })
}

function resolveDefaultFaceTokenBaseDir(): string {
  try {
    return app.getPath('userData')
  } catch {
    return join(tmpdir(), 'ai-ttrpg-npc-face-tokens')
  }
}
