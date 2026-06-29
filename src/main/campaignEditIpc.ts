import { ipcMain } from 'electron'
import type { Alignment, Temperament } from '../shared/alignment/types'
import type Database from 'better-sqlite3'
import {
  CampaignGenerationSchemaError,
  generateAdditionalRegion,
  persistRegionWithNpcs
} from '../agents/campaignGeneration'
import {
  getCampaignById,
  updateCampaignDeathMode,
  type DeathMode,
  type RespawnRules
} from '../db/repositories/campaigns'
import { updateNpcDisposition, updateNpcTraits } from '../db/repositories/npcs'
import { listRegionsByCampaign, updateRegionDescription } from '../db/repositories/regions'
import { buildAgentProvider, getCampaignDetail, type CampaignDetail } from './campaignIpc'
import { getDb } from './db'

export interface SetDeathModeInput {
  campaignId: string
  deathMode: DeathMode
  respawnRules?: RespawnRules | null
}

export function setCampaignDeathMode(db: Database.Database, input: SetDeathModeInput): CampaignDetail {
  updateCampaignDeathMode(db, input.campaignId, {
    deathMode: input.deathMode,
    respawnRules: input.respawnRules
  })
  return getCampaignDetail(db, input.campaignId)
}

export interface EditRegionDescriptionInput {
  campaignId: string
  regionId: string
  description: string
}

export function editRegionDescription(
  db: Database.Database,
  input: EditRegionDescriptionInput
): CampaignDetail {
  updateRegionDescription(db, input.regionId, input.description)
  return getCampaignDetail(db, input.campaignId)
}

export interface EditNpcDispositionInput {
  campaignId: string
  npcId: string
  disposition: string
}

export function editNpcDisposition(
  db: Database.Database,
  input: EditNpcDispositionInput
): CampaignDetail {
  updateNpcDisposition(db, input.npcId, input.disposition)
  return getCampaignDetail(db, input.campaignId)
}

export interface EditNpcTraitsInput {
  campaignId: string
  npcId: string
  disposition?: string
  alignment?: Alignment | null
  temperament?: Temperament
  canSpeak?: boolean
}

export function editNpcTraits(db: Database.Database, input: EditNpcTraitsInput): CampaignDetail {
  updateNpcTraits(db, input.npcId, {
    disposition: input.disposition,
    alignment: input.alignment,
    temperament: input.temperament,
    canSpeak: input.canSpeak
  })
  return getCampaignDetail(db, input.campaignId)
}

export interface GenerateRegionInput {
  campaignId: string
  seedPrompt: string
}

export async function generateRegionForCampaign(
  db: Database.Database,
  provider: ReturnType<typeof buildAgentProvider>,
  input: GenerateRegionInput
): Promise<CampaignDetail> {
  const campaign = getCampaignById(db, input.campaignId)
  if (!campaign) {
    throw new CampaignGenerationSchemaError(`Campaign "${input.campaignId}" not found`)
  }
  const seed = input.seedPrompt.trim()
  if (!seed) {
    throw new CampaignGenerationSchemaError('Region seed prompt is required')
  }

  const existingNames = listRegionsByCampaign(db, input.campaignId).map((region) => region.name)
  const generation = await generateAdditionalRegion(
    provider,
    campaign.premisePrompt,
    existingNames,
    seed
  )

  db.transaction(() =>
    persistRegionWithNpcs(db, input.campaignId, generation.region, generation.npcs)
  )()

  return getCampaignDetail(db, input.campaignId)
}

export function registerCampaignEditHandlers(): void {
  ipcMain.handle('campaigns:editRegionDescription', (_event, input: EditRegionDescriptionInput) =>
    editRegionDescription(getDb(), input)
  )

  ipcMain.handle('campaigns:editNpcDisposition', (_event, input: EditNpcDispositionInput) =>
    editNpcDisposition(getDb(), input)
  )

  ipcMain.handle('campaigns:editNpcTraits', (_event, input: EditNpcTraitsInput) =>
    editNpcTraits(getDb(), input)
  )

  ipcMain.handle('campaigns:generateRegion', async (_event, input: GenerateRegionInput) => {
    try {
      return { ok: true as const, detail: await generateRegionForCampaign(getDb(), buildAgentProvider(), input) }
    } catch (error) {
      const message =
        error instanceof CampaignGenerationSchemaError
          ? 'The narrative engine returned an invalid region. Try again or adjust your seed.'
          : 'Could not generate the new region. Try again.'
      return { ok: false as const, message }
    }
  })
}
