import type Database from 'better-sqlite3'
import type { Alignment, Temperament } from '../../shared/alignment/types'
import {
  DEFAULT_ADDITIONAL_REGION_NPC_COUNT,
  DEFAULT_NPCS_PER_REGION,
  DEFAULT_REGION_COUNT
} from '../../shared/campaignCreate/types'
import type { AvailableRaceOption } from '../../shared/raceSelection/types'
import type { CreateCampaignProgressCallback } from '../../shared/campaignCreate/types'
import type { DeathMode, RespawnRules } from '../../db/repositories/campaigns'
import type { Provider } from '../providers/types'

export class CampaignGenerationSchemaError extends Error {}

export const MAX_GENERATION_ATTEMPTS = 3
export const MAX_CAMPAIGN_SEED_ATTEMPTS = 5

export interface GenerationCounts {
  regionCount: number
  npcsPerRegion: number
}

export interface GenerateCampaignSeedOptions {
  regionCount?: number
  npcsPerRegion?: number
  availableRaces?: AvailableRaceOption[]
  onProgress?: CreateCampaignProgressCallback
}

export function resolveInitialGenerationCounts(
  regionCount?: number,
  npcsPerRegion?: number
): GenerationCounts {
  return {
    regionCount: regionCount ?? DEFAULT_REGION_COUNT,
    npcsPerRegion: npcsPerRegion ?? DEFAULT_NPCS_PER_REGION
  }
}

export function resolveAdditionalRegionNpcCount(npcCount?: number): number {
  return npcCount ?? DEFAULT_ADDITIONAL_REGION_NPC_COUNT
}

export interface GeneratedRegion {
  name: string
  description: string
  historyBackstory: string
  recentHistory: string
  potentialQuests: string[]
}

export interface GeneratedNpc {
  name: string
  role: string
  disposition: string
  regionName: string
  temperament: Temperament
  canSpeak: boolean
  alignment?: Alignment
  backstory?: string
  raceKey?: string
  backgroundKey?: string
  genderKey?: string
  classKey?: string
}

export interface NpcCoreBundle {
  canSpeak: boolean
  temperament: Temperament
  raceKey?: string
  genderKey?: string
  alignment?: Alignment
  classKey?: string
  backgroundKey?: string
}

export interface GeneratedStoryThread {
  title: string
  state: string
  summary: string
}

export interface GeneratedWorld {
  worldName: string
  worldSummary: string
  worldHistory: string
}

/** Known places/characters recalled from a recognizable premise setting. Empty when original. */
export interface CanonRecall {
  recognizedSetting: boolean
  settingLabel: string
  knownPlaces: string[]
  knownCharacters: string[]
}

export const EMPTY_CANON_RECALL: CanonRecall = {
  recognizedSetting: false,
  settingLabel: '',
  knownPlaces: [],
  knownCharacters: []
}

export interface WorldContext {
  worldName: string
  worldSummary: string
  worldHistory: string
}

export interface CampaignGenerationResult {
  world: GeneratedWorld
  regions: GeneratedRegion[]
  npcs: GeneratedNpc[]
  storyThread: GeneratedStoryThread
}

export interface AdditionalRegionResult {
  region: GeneratedRegion
  npcs: GeneratedNpc[]
}

export interface GeneratedSingleNpcResult {
  npc: GeneratedNpc
}

export interface CampaignHistoryContext {
  worldName: string
  worldSummary: string
  worldHistory: string
  currentStateSummary: string
  regionSummaries: Array<{ name: string; description: string; recentHistory: string }>
  storyThreadSummaries: Array<{ title: string; state: string; summary: string }>
  recentEvents: string[]
}

export interface AdditionalRegionRequest {
  seedPrompt: string
  npcCount?: number
  history?: CampaignHistoryContext
  availableRaces?: AvailableRaceOption[]
}

export interface PersistRegionWithNpcsInput {
  db: Database.Database
  provider: Provider
  campaignId: string
  generatedRegion: GeneratedRegion
  generatedNpcs: GeneratedNpc[]
}

export interface CampaignSetupInput {
  name: string
  premisePrompt: string
  deathMode: DeathMode
  respawnRules?: RespawnRules | null
  regionCount?: number
  npcsPerRegion?: number
}
