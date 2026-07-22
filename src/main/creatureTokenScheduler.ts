import { app } from 'electron'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { getBestiarySpeciesById } from '../db/repositories/bestiary'
import type { BestiarySpecies } from '../shared/bestiary/types'
import { getCampaignById, type Campaign } from '../db/repositories/campaigns'
import type { ImageProvider } from '../shared/imageGeneration'
import { normalizeCreatureAppearance } from '../shared/creatureTokens/appearance'
import {
  generateCreatureToken,
  shouldEnqueueCreatureToken,
  type CreatureTokenGenerateRequest
} from '../shared/creatureTokens'
import { persistCreatureTokenAsset } from './creatureTokenAsset'
import { logger } from './logger'

export interface CreatureTokenSchedulerLogger {
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
}

export interface CreatureTokenSchedulerDeps {
  db: Database.Database
  getCampaign: (campaignId: string) => Campaign | undefined
  getSpecies: (speciesId: string) => BestiarySpecies | undefined
  imageProvider: ImageProvider
  baseDir: string
  logger: CreatureTokenSchedulerLogger
}

export interface EnqueueCreatureTokenJobInput {
  campaignId: string
  speciesId: string
}

export type EnqueueCreatureTokenJobResult = 'enqueued' | 'skipped'

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

const LORE_SLICE_MAX = 280

export function buildCreatureTokenGenerateRequest(
  species: BestiarySpecies,
  campaignId: string
): CreatureTokenGenerateRequest {
  return {
    speciesId: species.id,
    campaignId,
    speciesName: species.name,
    appearance: normalizeCreatureAppearance(species.visualAppearance ?? {}),
    loreSlice: species.baseLore.slice(0, LORE_SLICE_MAX),
    styleContext: { presetId: null, notes: null }
  }
}

function creatureTokenEligibility(species: BestiarySpecies) {
  return {
    hasCreatureToken: species.creatureTokenPath != null
  }
}

function shouldScheduleCreatureToken(
  deps: CreatureTokenSchedulerDeps,
  input: EnqueueCreatureTokenJobInput
): boolean {
  const campaign = deps.getCampaign(input.campaignId)
  const species = deps.getSpecies(input.speciesId)
  if (!campaign || !species) {
    return false
  }
  return shouldEnqueueCreatureToken(
    campaign.generativeTokensEnabled === true,
    creatureTokenEligibility(species)
  )
}

async function runCreatureTokenJob(
  deps: CreatureTokenSchedulerDeps,
  input: EnqueueCreatureTokenJobInput
): Promise<void> {
  const species = deps.getSpecies(input.speciesId)
  if (!species) {
    return
  }
  const result = await generateCreatureToken(
    deps.imageProvider,
    buildCreatureTokenGenerateRequest(species, input.campaignId)
  )
  if (!result.ok) {
    deps.logger.warn(
      `Creature-token generation failed for ${input.speciesId}: ${result.message}`
    )
    return
  }
  const path = persistCreatureTokenAsset(deps.db, {
    speciesId: input.speciesId,
    campaignId: input.campaignId,
    bytesBase64: result.bytesBase64,
    mimeType: result.mimeType,
    baseDir: deps.baseDir
  })
  if (!path) {
    deps.logger.warn(`Creature-token persist failed for ${input.speciesId}`)
  }
}

export function enqueueCreatureTokenJob(
  deps: CreatureTokenSchedulerDeps,
  input: EnqueueCreatureTokenJobInput
): EnqueueCreatureTokenJobResult {
  if (!shouldScheduleCreatureToken(deps, input)) {
    return 'skipped'
  }
  void runCreatureTokenJob(deps, input).catch((error: unknown) => {
    deps.logger.error(`Creature-token job failed for ${input.speciesId}`, error)
  })
  return 'enqueued'
}

export function maybeEnqueueCreatureTokenAfterSpeciesCreate(
  deps: CreatureTokenSchedulerDeps,
  input: EnqueueCreatureTokenJobInput
): EnqueueCreatureTokenJobResult {
  return enqueueCreatureTokenJob(deps, input)
}

export function maybeEnqueueCreatureTokenAfterSpawn(
  deps: CreatureTokenSchedulerDeps,
  input: EnqueueCreatureTokenJobInput
): EnqueueCreatureTokenJobResult {
  return enqueueCreatureTokenJob(deps, input)
}

export function maybeEnqueueCreatureTokensForSpecies(
  deps: CreatureTokenSchedulerDeps,
  campaignId: string,
  speciesList: BestiarySpecies[]
): void {
  for (const species of speciesList) {
    enqueueCreatureTokenJob(deps, { campaignId, speciesId: species.id })
  }
}

export function createCreatureTokenSchedulerDeps(
  db: Database.Database,
  overrides?: Partial<CreatureTokenSchedulerDeps>
): CreatureTokenSchedulerDeps {
  const merged: CreatureTokenSchedulerDeps = {
    db,
    getCampaign: (id) => getCampaignById(db, id),
    getSpecies: (id) => getBestiarySpeciesById(db, id),
    imageProvider: mockPlaceholderImageProvider,
    baseDir: '',
    logger,
    ...overrides
  }
  if (!merged.baseDir) {
    merged.baseDir = resolveDefaultCreatureTokenBaseDir()
  }
  return merged
}

function resolveDefaultCreatureTokenBaseDir(): string {
  try {
    return app.getPath('userData')
  } catch {
    return join(tmpdir(), 'ai-ttrpg-creature-tokens')
  }
}
