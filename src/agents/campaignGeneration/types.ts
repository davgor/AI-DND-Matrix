import type Database from 'better-sqlite3'
import type { Alignment, Temperament } from '../../shared/alignment/types'
import {
  DEFAULT_ADDITIONAL_REGION_NPC_COUNT,
  DEFAULT_NPCS_PER_REGION,
  DEFAULT_REGION_COUNT
} from '../../shared/campaignCreate/types'
import type { DeathMode, RespawnRules } from '../../db/repositories/campaigns'
import type { Provider } from '../providers/types'

export class CampaignGenerationSchemaError extends Error {}

export const MAX_GENERATION_ATTEMPTS = 3

export interface GenerationCounts {
  regionCount: number
  npcsPerRegion: number
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
}

export interface GeneratedStoryThread {
  title: string
  state: string
  summary: string
}

export interface CampaignGenerationResult {
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
  currentStateSummary: string
  regionSummaries: Array<{ name: string; description: string; recentHistory: string }>
  storyThreadSummaries: Array<{ title: string; state: string; summary: string }>
  recentEvents: string[]
}

export interface AdditionalRegionRequest {
  seedPrompt: string
  npcCount?: number
  history?: CampaignHistoryContext
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
