import { ipcMain, type BrowserWindow } from 'electron'
import type Database from 'better-sqlite3'
import {
  CampaignGenerationSchemaError,
  formatSchemaFailureAttemptsLog,
  generateCampaignSeed,
  persistGeneratedCampaign
} from '../agents/campaignGeneration'
import type { CampaignSetupInput } from '../agents/campaignGeneration'
import type { Provider } from '../agents/providers/types'
import { isTruncationError } from '../agents/providers/tokenEscalation'
import { ProviderUnreachableError } from '../agents/providers/withRetry'
import { buildAvailableRaceOptions } from '../agents/raceLore'
import { buildCreateProgress } from '../shared/campaignCreate/stageMessages'
import {
  type CreateCampaignFailureCategory,
  type CreateCampaignProgress,
  type CreateCampaignRequest
} from '../shared/campaignCreate/types'
import { isValidCreateCampaignRequest, resolveNpcsPerRegion, resolveRegionCount } from '../shared/campaignCreate/validation'
import { touchLastPlayed } from '../db/repositories/sessions'
import { listBestiarySpecies } from '../db/repositories/bestiary'
import type { DeathMode, RespawnRules } from '../db/repositories/campaigns'
import { buildAgentProvider, getCampaignDetail, type CampaignDetail } from './campaignIpc'
import { getDb } from './db'
import { logger } from './logger'
import {
  createNpcFaceTokenSchedulerDeps,
  maybeEnqueueNpcFaceTokensForNpcs,
  type NpcFaceTokenSchedulerDeps
} from './npcFaceTokenScheduler'
import {
  createCreatureTokenSchedulerDeps,
  maybeEnqueueCreatureTokensForSpecies,
  type CreatureTokenSchedulerDeps
} from './creatureTokenScheduler'

export interface CreateCampaignSuccess {
  ok: true
  detail: CampaignDetail
}

export interface CreateCampaignFailure {
  ok: false
  category: CreateCampaignFailureCategory
  message: string
}

export type CreateCampaignResult = CreateCampaignSuccess | CreateCampaignFailure

export interface CreateCampaignLog {
  error: (message: string, ...args: unknown[]) => void
}

export interface CreateCampaignSchedulerDeps {
  faceToken?: NpcFaceTokenSchedulerDeps
  creatureToken?: CreatureTokenSchedulerDeps
  log?: CreateCampaignLog
}

let mainWindow: BrowserWindow | undefined
let createInFlight = false
let activeSessionId: string | null = null

function emitProgress(payload: CreateCampaignProgress): void {
  mainWindow?.webContents.send('campaignCreate:progress', payload)
}

function toSetupInput(request: CreateCampaignRequest): CampaignSetupInput {
  return {
    name: request.name ?? request.premisePrompt.slice(0, 40),
    premisePrompt: request.premisePrompt,
    deathMode: (request.deathMode ?? 'standard') as DeathMode,
    respawnRules: (request.respawnRules ?? null) as RespawnRules | null,
    regionCount: resolveRegionCount(request.regionCount),
    npcsPerRegion: resolveNpcsPerRegion(request.npcsPerRegion),
    generativeTokensEnabled: request.generativeTokensEnabled === true,
    npcFaceTokenGenerationEnabled: request.npcFaceTokenGenerationEnabled === true,
    enemyTokenGenerationEnabled: request.enemyTokenGenerationEnabled === true
  }
}

function failure(
  category: CreateCampaignFailureCategory,
  message: string
): CreateCampaignFailure {
  return { ok: false, category, message }
}

function mapCreateCampaignError(error: unknown): CreateCampaignFailure {
  if (isTruncationError(error)) {
    return failure(
      'generation',
      'The narrative engine hit its output limit while generating the campaign. Raise local context size in Settings, simplify your premise, or try again.'
    )
  }
  if (error instanceof ProviderUnreachableError) {
    return failure(
      'generation',
      'The narrative engine could not be reached. Check Settings and try again.'
    )
  }
  if (error instanceof CampaignGenerationSchemaError) {
    if (/valid world schema/i.test(error.message)) {
      return failure(
        'generation',
        'The narrative engine could not build a valid world for this premise. Try a simpler premise, or switch AI providers in Settings.'
      )
    }
    if (/valid factions schema/i.test(error.message)) {
      return failure(
        'generation',
        'The narrative engine could not build valid factions for this premise. Try again, simplify your premise, or switch AI providers in Settings.'
      )
    }
    return failure(
      'generation',
      'The narrative engine returned an invalid campaign. Try again or simplify your premise.'
    )
  }
  return failure('persistence', 'Could not save the new campaign. Check disk space and try again.')
}

export async function createCampaignFromRequest(
  db: Database.Database,
  provider: Provider,
  request: CreateCampaignRequest,
  schedulerDeps?: CreateCampaignSchedulerDeps
): Promise<CreateCampaignResult> {
  const input = toSetupInput(request)
  try {
    const generation = await generateCampaignSeed(provider, input.premisePrompt, {
      regionCount: input.regionCount,
      npcsPerRegion: input.npcsPerRegion,
      availableRaces: buildAvailableRaceOptions([]),
      onProgress: (stage) => emitProgress(buildCreateProgress(stage))
    })
    emitProgress(buildCreateProgress('persist'))
    const campaign = await persistGeneratedCampaign({ db, provider, input, generation })
    touchLastPlayed(db, campaign.id)
    const detail = getCampaignDetail(db, campaign.id)
    maybeEnqueueNpcFaceTokensForNpcs(
      schedulerDeps?.faceToken ?? createNpcFaceTokenSchedulerDeps(db),
      campaign.id,
      detail.npcs
    )
    maybeEnqueueCreatureTokensForSpecies(
      schedulerDeps?.creatureToken ?? createCreatureTokenSchedulerDeps(db),
      campaign.id,
      listBestiarySpecies(db, campaign.id)
    )
    return { ok: true, detail }
  } catch (error) {
    const log = schedulerDeps?.log ?? logger
    log.error('Campaign create failed', error)
    if (error instanceof CampaignGenerationSchemaError) {
      const details = formatSchemaFailureAttemptsLog(error)
      if (details) {
        log.error(details)
      }
    }
    return mapCreateCampaignError(error)
  }
}

export function registerCampaignCreateHandlers(window: BrowserWindow): void {
  mainWindow = window

  ipcMain.handle('campaigns:create', async (_event, raw: unknown): Promise<CreateCampaignResult> => {
    if (!isValidCreateCampaignRequest(raw)) {
      return failure('validation', 'Campaign setup payload is invalid. Check required fields and try again.')
    }
    if (createInFlight) {
      return failure('busy', 'A campaign is already being created. Wait for it to finish or cancel.')
    }
    if (activeSessionId === raw.sessionId) {
      return failure('busy', 'This campaign request was already submitted.')
    }
    createInFlight = true
    activeSessionId = raw.sessionId
    try {
      return await createCampaignFromRequest(getDb(), buildAgentProvider(), raw)
    } finally {
      createInFlight = false
    }
  })
}

/** @internal test hook */
export function resetCampaignCreateForTests(): void {
  createInFlight = false
  activeSessionId = null
  mainWindow = undefined
}
