import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import { generateAndPersistCampaign } from '../agents/campaignGeneration'
import { createProviderRegistry, selectProvider } from '../agents/providers/selectProvider'
import { withTokenEscalation } from '../agents/providers/tokenEscalation'
import { withRetry } from '../agents/providers/withRetry'
import { withUsageRecording } from '../agents/providers/withUsageRecording'
import type { Provider } from '../agents/providers/types'
import {
  getCampaignById,
  listCampaignsByLastPlayed,
  type Campaign,
  type CampaignWithLastPlayed
} from '../db/repositories/campaigns'
import { listCharactersByCampaign, type Character } from '../db/repositories/characters'
import { listNpcsByRegion, type Npc } from '../db/repositories/npcs'
import { listRegionsByCampaign, type Region } from '../db/repositories/regions'
import { listRegionHistoryByRegion } from '../db/repositories/regionHistory'
import { listStoryThreadsByCampaign, type StoryThread } from '../db/repositories/storyThreads'
import { listQuestHooksByRegion } from '../db/repositories/worldFacts'
import { listDeitiesByCampaign, type Deity } from '../db/repositories/deities'
import {
  listFactionRelationsByCampaign,
  listFactionsByCampaign
} from '../db/repositories/factions'
import {
  listBestiarySpecies,
  listBestiaryVariants
} from '../db/repositories/bestiary'
import type { BestiarySpecies, BestiaryVariant } from '../shared/bestiary/types'
import type { Faction, FactionRelation } from '../shared/factions'
import { touchLastPlayed } from '../db/repositories/sessions'
import { loadConfig } from './config'
import { logger } from './logger'
import { getDb } from './db'
import { createElectronSecretCodec, getSettingsFilePath, loadSettingsOrNull } from './settingsStore'
import { resolveProviderRegistryConfig } from './settingsRuntime'
import { DEFAULT_PROVIDER_SETTINGS } from '../shared/settings/types'
import type { RegionExtras } from '../shared/campaign/regionExtras'

const NEW_CAMPAIGN_NAME_LENGTH = 40

export type { RegionExtras } from '../shared/campaign/regionExtras'

export interface CampaignBestiaryEntry {
  species: BestiarySpecies
  variants: BestiaryVariant[]
}

export interface CampaignDetail {
  campaign: Campaign | undefined
  regions: Region[]
  npcs: Npc[]
  regionExtras: RegionExtras[]
  storyThreads: StoryThread[]
  characters: Character[]
  deities: Deity[]
  factions: Faction[]
  factionRelations: FactionRelation[]
  bestiary: CampaignBestiaryEntry[]
}

export function listCampaignsForSidebar(db: Database.Database): CampaignWithLastPlayed[] {
  return listCampaignsByLastPlayed(db)
}

export function buildRegionExtras(db: Database.Database, campaignId: string): RegionExtras[] {
  return listRegionsByCampaign(db, campaignId).map((region) => {
    const history = listRegionHistoryByRegion(db, region.id)
    return {
      regionId: region.id,
      backstory: history.find((entry) => entry.inGameDate === 0)?.content ?? '',
      recentHistory: history.find((entry) => entry.inGameDate === 1)?.content ?? '',
      questHooks: listQuestHooksByRegion(db, region.id).map((fact) => fact.content)
    }
  })
}

export function getCampaignDetail(db: Database.Database, campaignId: string): CampaignDetail {
  const regions = listRegionsByCampaign(db, campaignId)
  const speciesList = listBestiarySpecies(db, campaignId)
  return {
    campaign: getCampaignById(db, campaignId),
    regions,
    npcs: regions.flatMap((region) => listNpcsByRegion(db, region.id)),
    regionExtras: buildRegionExtras(db, campaignId),
    storyThreads: listStoryThreadsByCampaign(db, campaignId),
    characters: listCharactersByCampaign(db, campaignId),
    deities: listDeitiesByCampaign(db, campaignId),
    factions: listFactionsByCampaign(db, campaignId),
    factionRelations: listFactionRelationsByCampaign(db, campaignId),
    bestiary: speciesList.map((species) => ({
      species,
      variants: listBestiaryVariants(db, species.id)
    }))
  }
}

export function selectCampaign(db: Database.Database, campaignId: string): CampaignDetail {
  touchLastPlayed(db, campaignId)
  return getCampaignDetail(db, campaignId)
}

export function buildAgentProvider(): Provider {
  const envConfig = loadConfig()
  const persisted = loadSettingsOrNull(getSettingsFilePath(), createElectronSecretCodec(), DEFAULT_PROVIDER_SETTINGS)
  const resolved = resolveProviderRegistryConfig(envConfig, persisted)
  const registry = createProviderRegistry(resolved)
  // 040.14: escalation wraps retry — a truncated response is retried with a
  // doubled cap (each cap attempt keeps its own connectivity retries beneath).
  // 112: usage recording wraps outside escalation so retries aggregate into one event.
  const escalated = withTokenEscalation(
    withRetry(selectProvider(resolved.agentProvider, registry), logger)
  )
  const defaultModelId =
    resolved.agentProvider === 'claude' ? resolved.claudeModel : resolved.agentProvider
  return withUsageRecording(escalated, {
    getDb,
    providerName: resolved.agentProvider,
    defaultModelId,
    warn: (message) => logger.warn(message),
    logInsertError: (message, error) => logger.error(message, error)
  })
}

export async function generateCampaignFromPrompt(
  db: Database.Database,
  provider: Provider,
  premisePrompt: string
): Promise<CampaignDetail> {
  const campaign = await generateAndPersistCampaign(db, provider, {
    name: premisePrompt.slice(0, NEW_CAMPAIGN_NAME_LENGTH),
    premisePrompt,
    deathMode: 'legendary'
  })
  touchLastPlayed(db, campaign.id)
  return getCampaignDetail(db, campaign.id)
}

export function registerCampaignHandlers(): void {
  ipcMain.handle('campaigns:list', () => listCampaignsForSidebar(getDb()))

  ipcMain.handle('campaigns:select', (_event, campaignId: string) =>
    selectCampaign(getDb(), campaignId)
  )

  ipcMain.handle('campaigns:generate', (_event, premisePrompt: string) =>
    generateCampaignFromPrompt(getDb(), buildAgentProvider(), premisePrompt)
  )
}
