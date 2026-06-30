import { ipcMain, type BrowserWindow } from 'electron'
import type Database from 'better-sqlite3'
import { CampaignGenerationSchemaError, generateCampaignSeed, persistGeneratedCampaign } from '../agents/campaignGeneration'
import type { CampaignSetupInput } from '../agents/campaignGeneration'
import type { Provider } from '../agents/providers/types'
import {
  CREATE_CAMPAIGN_STAGE_ORDER,
  CREATE_CAMPAIGN_STAGE_TOTAL,
  type CreateCampaignFailureCategory,
  type CreateCampaignProgress,
  type CreateCampaignRequest
} from '../shared/campaignCreate/types'
import { isValidCreateCampaignRequest, resolveNpcsPerRegion, resolveRegionCount } from '../shared/campaignCreate/validation'
import { touchLastPlayed } from '../db/repositories/sessions'
import type { DeathMode, RespawnRules } from '../db/repositories/campaigns'
import { buildAgentProvider, getCampaignDetail, type CampaignDetail } from './campaignIpc'
import { getDb } from './db'

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

let mainWindow: BrowserWindow | undefined
let createInFlight = false
let activeSessionId: string | null = null

function emitProgress(payload: CreateCampaignProgress): void {
  mainWindow?.webContents.send('campaignCreate:progress', payload)
}

function progressForStage(stageIndex: number, statusText: string): CreateCampaignProgress {
  return {
    stage: CREATE_CAMPAIGN_STAGE_ORDER[stageIndex] as CreateCampaignProgress['stage'],
    stageIndex,
    stageTotal: CREATE_CAMPAIGN_STAGE_TOTAL,
    statusText
  }
}

function toSetupInput(request: CreateCampaignRequest): CampaignSetupInput {
  return {
    name: request.name ?? request.premisePrompt.slice(0, 40),
    premisePrompt: request.premisePrompt,
    deathMode: (request.deathMode ?? 'standard') as DeathMode,
    respawnRules: (request.respawnRules ?? null) as RespawnRules | null,
    regionCount: resolveRegionCount(request.regionCount),
    npcsPerRegion: resolveNpcsPerRegion(request.npcsPerRegion)
  }
}

function failure(
  category: CreateCampaignFailureCategory,
  message: string
): CreateCampaignFailure {
  return { ok: false, category, message }
}

export async function createCampaignFromRequest(
  db: Database.Database,
  provider: Provider,
  request: CreateCampaignRequest
): Promise<CreateCampaignResult> {
  const input = toSetupInput(request)
  try {
    emitProgress(progressForStage(0, 'Sending your campaign premise to the narrative engine'))
    const generation = await generateCampaignSeed(provider, input.premisePrompt, {
      regionCount: input.regionCount,
      npcsPerRegion: input.npcsPerRegion
    })
    emitProgress(progressForStage(1, 'Interpreting generated world details'))
    emitProgress(progressForStage(2, 'Writing regions, NPCs, and story to your save'))
    const campaign = await persistGeneratedCampaign(db, provider, input, generation)
    touchLastPlayed(db, campaign.id)
    return { ok: true, detail: getCampaignDetail(db, campaign.id) }
  } catch (error) {
    if (error instanceof CampaignGenerationSchemaError) {
      return failure('generation', 'The narrative engine returned an invalid campaign. Try again or simplify your premise.')
    }
    return failure('persistence', 'Could not save the new campaign. Check disk space and try again.')
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
