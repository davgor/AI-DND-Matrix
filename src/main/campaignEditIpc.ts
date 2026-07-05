import { ipcMain } from 'electron'
import type { Alignment, Temperament } from '../shared/alignment/types'
import type Database from 'better-sqlite3'
import {
  CampaignGenerationSchemaError,
  assembleCampaignHistoryContext,
  generateAdditionalRegion,
  generateSingleNpc,
  persistRegionWithNpcs,
  resolveAdditionalRegionNpcCount
} from '../agents/campaignGeneration'
import { buildAvailableRaceOptions, resolveOrRealizeCampaignRace } from '../agents/raceLore'
import { createNpcWithCombatReview } from '../db/repositories/npcCombatHydration'
import {
  getCampaignById,
  updateCampaignDeathMode,
  type DeathMode,
  type RespawnRules
} from '../db/repositories/campaigns'
import { listNpcsByRegion, updateNpcDisposition, updateNpcTraits } from '../db/repositories/npcs'
import { listCampaignRaces } from '../db/repositories/campaignRaces'
import { getRegionById, listRegionsByCampaign, updateRegionDescription } from '../db/repositories/regions'
import {
  MAX_ADDITIONAL_REGION_NPC_COUNT,
  MIN_ADDITIONAL_REGION_NPC_COUNT
} from '../shared/campaignCreate/types'
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
  npcCount?: number
}

function isValidAdditionalRegionNpcCount(value: unknown): value is number | undefined {
  if (value === undefined) {
    return true
  }
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_ADDITIONAL_REGION_NPC_COUNT &&
    value <= MAX_ADDITIONAL_REGION_NPC_COUNT
  )
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
  if (!isValidAdditionalRegionNpcCount(input.npcCount)) {
    throw new CampaignGenerationSchemaError('NPC count must be an integer from 0 to 10')
  }

  const npcCount = resolveAdditionalRegionNpcCount(input.npcCount)
  const existingNames = listRegionsByCampaign(db, input.campaignId).map((region) => region.name)
  const history = assembleCampaignHistoryContext(db, input.campaignId)
  const generation = await generateAdditionalRegion(
    provider,
    campaign.premisePrompt,
    existingNames,
    {
      seedPrompt: seed,
      npcCount,
      history,
      availableRaces: buildAvailableRaceOptions(listCampaignRaces(db, input.campaignId))
    }
  )

  await persistRegionWithNpcs({
    db,
    provider,
    campaignId: input.campaignId,
    generatedRegion: generation.region,
    generatedNpcs: generation.npcs
  })

  return getCampaignDetail(db, input.campaignId)
}

export interface GenerateNpcInput {
  campaignId: string
  regionId: string
  seedPrompt: string
}

export async function generateNpcForCampaign(
  db: Database.Database,
  provider: ReturnType<typeof buildAgentProvider>,
  input: GenerateNpcInput
): Promise<CampaignDetail> {
  const campaign = getCampaignById(db, input.campaignId)
  if (!campaign) {
    throw new CampaignGenerationSchemaError(`Campaign "${input.campaignId}" not found`)
  }
  const seed = input.seedPrompt.trim()
  if (!seed) {
    throw new CampaignGenerationSchemaError('NPC seed prompt is required')
  }
  const region = getRegionById(db, input.regionId)
  if (!region || region.campaignId !== input.campaignId) {
    throw new CampaignGenerationSchemaError(`Region "${input.regionId}" not found in campaign`)
  }

  const existingNpcNames = listNpcsByRegion(db, region.id).map((npc) => npc.name)
  const availableRaces = buildAvailableRaceOptions(listCampaignRaces(db, input.campaignId))
  const generation = await generateSingleNpc(provider, {
    campaignPremise: campaign.premisePrompt,
    regionName: region.name,
    regionDescription: region.description,
    existingNpcNames,
    seedPrompt: seed,
    availableRaces
  })

  if (generation.npc.canSpeak && generation.npc.raceKey) {
    await resolveOrRealizeCampaignRace(db, provider, {
      campaignId: input.campaignId,
      raceKey: generation.npc.raceKey
    })
  }

  await createNpcWithCombatReview(db, provider, {
    campaignId: input.campaignId,
    regionId: region.id,
    name: generation.npc.name,
    role: generation.npc.role,
    disposition: generation.npc.disposition,
    alignment: generation.npc.alignment ?? null,
    temperament: generation.npc.temperament,
    canSpeak: generation.npc.canSpeak,
    backstory: generation.npc.backstory ?? '',
    raceKey: generation.npc.raceKey ?? null
  })

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

  ipcMain.handle('campaigns:generateNpc', async (_event, input: GenerateNpcInput) => {
    try {
      return { ok: true as const, detail: await generateNpcForCampaign(getDb(), buildAgentProvider(), input) }
    } catch (error) {
      const message =
        error instanceof CampaignGenerationSchemaError
          ? 'The narrative engine returned an invalid NPC. Try again or adjust your seed.'
          : 'Could not generate the NPC. Try again.'
      return { ok: false as const, message }
    }
  })
}
