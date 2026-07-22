import { ipcMain } from 'electron'
import type { Alignment, Temperament } from '../shared/alignment/types'
import type Database from 'better-sqlite3'
import {
  CampaignGenerationSchemaError,
  assembleCampaignHistoryContext,
  generateAdditionalRegion,
  generateWorldSummaryFromHistory,
  persistRegionWithNpcs,
  resolveAdditionalRegionNpcCount
} from '../agents/campaignGeneration'
import type { Provider } from '../agents/providers/types'
import { generateFlaggedNpc } from '../agents/campaignGeneration/flaggedNpc'
import { buildAvailableRaceOptions } from '../agents/raceLore'
import { createNpcWithCombatReview } from '../db/repositories/npcCombatHydration'
import {
  getCampaignById,
  updateCampaignWorldHistory,
  updateCampaignWorldSummary,
  updateCampaignPantheonSummary,
  updateCampaignFactionsSummary,
  updateCampaignGenerativeTokensEnabled
} from '../db/repositories/campaigns'
import { deleteNpcCascade } from '../db/repositories/deleteNpc'
import { deleteRegionCascade } from '../db/repositories/deleteRegion'
import { getNpcById, listNpcsByRegion, updateNpcDisposition, updateNpcTraits, type Npc } from '../db/repositories/npcs'
import { getRegionById, listRegionsByCampaign, updateRegionDescription } from '../db/repositories/regions'
import { listCampaignRaces } from '../db/repositories/campaignRaces'
import { listDeitiesByCampaign } from '../db/repositories/deities'
import { getFactionByKey } from '../db/repositories/factions'
import {
  MAX_ADDITIONAL_REGION_NPC_COUNT,
  MIN_ADDITIONAL_REGION_NPC_COUNT
} from '../shared/campaignCreate/types'
import { buildAgentProvider, getCampaignDetail, type CampaignDetail } from './campaignIpc'
import { getDb } from './db'
import {
  createNpcFaceTokenSchedulerDeps,
  maybeEnqueueNpcFaceTokenAfterCreate,
  maybeEnqueueNpcFaceTokensForNpcs,
  type NpcFaceTokenSchedulerDeps
} from './npcFaceTokenScheduler'

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

export interface DeleteRegionInput {
  campaignId: string
  regionId: string
}

export function deleteRegionForCampaign(
  db: Database.Database,
  input: DeleteRegionInput
): CampaignDetail {
  const region = getRegionById(db, input.regionId)
  if (!region || region.campaignId !== input.campaignId) {
    throw new Error(`Region "${input.regionId}" not found for campaign "${input.campaignId}"`)
  }
  deleteRegionCascade(db, input.regionId)
  return getCampaignDetail(db, input.campaignId)
}

export interface DeleteNpcInput {
  campaignId: string
  npcId: string
}

export function deleteNpcForCampaign(
  db: Database.Database,
  input: DeleteNpcInput
): CampaignDetail {
  const npc = getNpcById(db, input.npcId)
  if (!npc || npc.campaignId !== input.campaignId) {
    throw new Error(`NPC "${input.npcId}" not found for campaign "${input.campaignId}"`)
  }
  deleteNpcCascade(db, input.npcId)
  return getCampaignDetail(db, input.campaignId)
}

export interface EditWorldSummaryInput {
  campaignId: string
  worldSummary: string
}

export function editWorldSummary(
  db: Database.Database,
  input: EditWorldSummaryInput
): CampaignDetail {
  updateCampaignWorldSummary(db, input.campaignId, input.worldSummary)
  return getCampaignDetail(db, input.campaignId)
}

export interface EditPantheonSummaryInput {
  campaignId: string
  pantheonSummary: string
}

export function editPantheonSummary(
  db: Database.Database,
  input: EditPantheonSummaryInput
): CampaignDetail {
  updateCampaignPantheonSummary(db, input.campaignId, input.pantheonSummary)
  return getCampaignDetail(db, input.campaignId)
}

export interface EditFactionsSummaryInput {
  campaignId: string
  factionsSummary: string
}

export function editFactionsSummary(
  db: Database.Database,
  input: EditFactionsSummaryInput
): CampaignDetail {
  updateCampaignFactionsSummary(db, input.campaignId, input.factionsSummary)
  return getCampaignDetail(db, input.campaignId)
}

export interface EditGenerativeTokensInput {
  campaignId: string
  enabled: boolean
}

export function editGenerativeTokens(
  db: Database.Database,
  input: EditGenerativeTokensInput
): CampaignDetail {
  updateCampaignGenerativeTokensEnabled(db, input.campaignId, input.enabled)
  return getCampaignDetail(db, input.campaignId)
}

/** @deprecated Prefer editGenerativeTokens. */
export type EditNpcFaceTokenGenerationInput = EditGenerativeTokensInput

/** @deprecated Prefer editGenerativeTokens. */
export function editNpcFaceTokenGeneration(
  db: Database.Database,
  input: EditNpcFaceTokenGenerationInput
): CampaignDetail {
  return editGenerativeTokens(db, input)
}

/** @deprecated Prefer editGenerativeTokens. */
export type EditEnemyTokenGenerationInput = EditGenerativeTokensInput

/** @deprecated Prefer editGenerativeTokens. */
export function editEnemyTokenGeneration(
  db: Database.Database,
  input: EditEnemyTokenGenerationInput
): CampaignDetail {
  return editGenerativeTokens(db, input)
}

export interface EditWorldHistoryInput {
  campaignId: string
  worldHistory: string
}

export async function editWorldHistory(
  db: Database.Database,
  provider: Provider,
  input: EditWorldHistoryInput
): Promise<CampaignDetail> {
  const campaign = getCampaignById(db, input.campaignId)
  if (!campaign) {
    throw new Error('Campaign not found')
  }
  const worldSummary = await generateWorldSummaryFromHistory(provider, {
    premisePrompt: campaign.premisePrompt,
    worldName: campaign.worldName,
    worldHistory: input.worldHistory
  })
  const apply = db.transaction(() => {
    updateCampaignWorldHistory(db, input.campaignId, input.worldHistory)
    updateCampaignWorldSummary(db, input.campaignId, worldSummary)
  })
  apply()
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

function buildAdditionalRegionGenerationOptions(
  db: Database.Database,
  campaignId: string,
  seed: string,
  npcCount: number
) {
  const history = assembleCampaignHistoryContext(db, campaignId)
  return {
    seedPrompt: seed,
    npcCount,
    history,
    availableRaces: buildAvailableRaceOptions(listCampaignRaces(db, campaignId)),
    deities: listDeitiesByCampaign(db, campaignId).map((deity) => ({
      name: deity.name,
      epithet: deity.epithet,
      domains: deity.domains,
      tenets: deity.tenets,
      blurb: deity.blurb,
      isForgotten: deity.isForgotten
    }))
  }
}

function enqueueFaceTokensForGeneratedRegion(
  db: Database.Database,
  campaignId: string,
  regionName: string,
  faceTokenSchedulerDeps?: NpcFaceTokenSchedulerDeps
): void {
  const schedulerDeps = faceTokenSchedulerDeps ?? createNpcFaceTokenSchedulerDeps(db)
  const newRegion = listRegionsByCampaign(db, campaignId).find((region) => region.name === regionName)
  if (newRegion) {
    maybeEnqueueNpcFaceTokensForNpcs(
      schedulerDeps,
      campaignId,
      listNpcsByRegion(db, newRegion.id)
    )
  }
}

export async function generateRegionForCampaign(
  db: Database.Database,
  provider: ReturnType<typeof buildAgentProvider>,
  input: GenerateRegionInput,
  faceTokenSchedulerDeps?: NpcFaceTokenSchedulerDeps
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
  const generation = await generateAdditionalRegion(
    provider,
    campaign.premisePrompt,
    existingNames,
    buildAdditionalRegionGenerationOptions(db, input.campaignId, seed, npcCount)
  )

  await persistRegionWithNpcs({
    db,
    provider,
    campaignId: input.campaignId,
    generatedRegion: generation.region,
    generatedNpcs: generation.npcs
  })

  enqueueFaceTokensForGeneratedRegion(
    db,
    input.campaignId,
    generation.region.name,
    faceTokenSchedulerDeps
  )

  return getCampaignDetail(db, input.campaignId)
}

export interface GenerateNpcInput {
  campaignId: string
  regionId: string
  seedPrompt: string
}

function resolveGeneratedNpcFactionFields(
  db: Database.Database,
  campaignId: string,
  generatedNpc: Awaited<ReturnType<typeof generateFlaggedNpc>>['npc']
): { factionId: string | null; factionMembershipRole: string | null } {
  const factionKey = generatedNpc.factionKey?.trim()
  if (!factionKey) {
    return { factionId: null, factionMembershipRole: null }
  }
  const faction = getFactionByKey(db, campaignId, factionKey)
  if (!faction) {
    return { factionId: null, factionMembershipRole: null }
  }
  return {
    factionId: faction.id,
    factionMembershipRole: generatedNpc.membershipRole?.trim() || null
  }
}

async function persistGeneratedNpcForCampaign(input: {
  db: Database.Database
  provider: ReturnType<typeof buildAgentProvider>
  campaignId: string
  regionId: string
  generatedNpc: Awaited<ReturnType<typeof generateFlaggedNpc>>['npc']
}): Promise<Npc> {
  const { db, provider, campaignId, regionId, generatedNpc } = input
  return createNpcWithCombatReview(db, provider, {
    campaignId,
    regionId,
    name: generatedNpc.name,
    role: generatedNpc.role,
    disposition: generatedNpc.disposition,
    alignment: generatedNpc.alignment ?? null,
    temperament: generatedNpc.temperament,
    canSpeak: generatedNpc.canSpeak,
    backstory: generatedNpc.backstory ?? '',
    raceKey: generatedNpc.raceKey ?? null,
    backgroundKey: generatedNpc.backgroundKey ?? null,
    genderKey: generatedNpc.genderKey ?? null,
    classKey: generatedNpc.classKey ?? null,
    speakingStyleSpecimen: generatedNpc.speakingStyleSpecimen ?? null,
    speakingStyleExamples: generatedNpc.speakingStyleExamples ?? null,
    ...resolveGeneratedNpcFactionFields(db, campaignId, generatedNpc)
  })
}

export async function generateNpcForCampaign(
  db: Database.Database,
  provider: ReturnType<typeof buildAgentProvider>,
  input: GenerateNpcInput,
  faceTokenSchedulerDeps?: NpcFaceTokenSchedulerDeps
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
  const generation = await generateFlaggedNpc(db, provider, {
    campaignId: input.campaignId,
    regionId: region.id,
    regionName: region.name,
    regionDescription: region.description,
    seedPrompt: seed,
    existingNpcNames
  })

  const npc = await persistGeneratedNpcForCampaign({
    db,
    provider,
    campaignId: input.campaignId,
    regionId: region.id,
    generatedNpc: generation.npc
  })

  maybeEnqueueNpcFaceTokenAfterCreate(
    faceTokenSchedulerDeps ?? createNpcFaceTokenSchedulerDeps(db),
    input.campaignId,
    npc.id
  )

  return getCampaignDetail(db, input.campaignId)
}

function registerCampaignEditGenerationHandlers(): void {
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

export function registerCampaignEditHandlers(): void {
  ipcMain.handle('campaigns:editRegionDescription', (_event, input: EditRegionDescriptionInput) =>
    editRegionDescription(getDb(), input)
  )

  ipcMain.handle('campaigns:deleteRegion', (_event, input: DeleteRegionInput) =>
    deleteRegionForCampaign(getDb(), input)
  )

  ipcMain.handle('campaigns:editWorldSummary', (_event, input: EditWorldSummaryInput) =>
    editWorldSummary(getDb(), input)
  )

  ipcMain.handle('campaigns:editPantheonSummary', (_event, input: EditPantheonSummaryInput) =>
    editPantheonSummary(getDb(), input)
  )

  ipcMain.handle('campaigns:editFactionsSummary', (_event, input: EditFactionsSummaryInput) =>
    editFactionsSummary(getDb(), input)
  )

  ipcMain.handle(
    'campaigns:editGenerativeTokens',
    (_event, input: EditGenerativeTokensInput) => editGenerativeTokens(getDb(), input)
  )

  ipcMain.handle(
    'campaigns:editNpcFaceTokenGeneration',
    (_event, input: EditNpcFaceTokenGenerationInput) => editNpcFaceTokenGeneration(getDb(), input)
  )

  ipcMain.handle(
    'campaigns:editEnemyTokenGeneration',
    (_event, input: EditEnemyTokenGenerationInput) => editEnemyTokenGeneration(getDb(), input)
  )

  ipcMain.handle('campaigns:editWorldHistory', async (_event, input: EditWorldHistoryInput) =>
    editWorldHistory(getDb(), buildAgentProvider(), input)
  )

  ipcMain.handle('campaigns:editNpcDisposition', (_event, input: EditNpcDispositionInput) =>
    editNpcDisposition(getDb(), input)
  )

  ipcMain.handle('campaigns:editNpcTraits', (_event, input: EditNpcTraitsInput) =>
    editNpcTraits(getDb(), input)
  )

  ipcMain.handle('campaigns:deleteNpc', (_event, input: DeleteNpcInput) =>
    deleteNpcForCampaign(getDb(), input)
  )

  registerCampaignEditGenerationHandlers()
}
