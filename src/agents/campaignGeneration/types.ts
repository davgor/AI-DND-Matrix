import type Database from 'better-sqlite3'
import type { Alignment, Temperament } from '../../shared/alignment/types'
import type { Bucket } from '../../shared/catalogTaxonomy'
import {
  DEFAULT_ADDITIONAL_REGION_NPC_COUNT,
  DEFAULT_NPCS_PER_REGION,
  DEFAULT_REGION_COUNT
} from '../../shared/campaignCreate/types'
import type {
  FactionKind,
  FactionPressure,
  FactionRelationStance
} from '../../shared/factions'
import type { AvailableRaceOption } from '../../shared/raceSelection/types'
import type { CreateCampaignProgressCallback } from '../../shared/campaignCreate/types'
import type { DeathMode, RespawnRules } from '../../db/repositories/campaigns'
import type { Provider } from '../providers/types'

export class CampaignGenerationSchemaError extends Error {
  readonly failedAttempts: GenerationSchemaFailureAttempt[]

  constructor(message: string, failedAttempts: GenerationSchemaFailureAttempt[] = []) {
    super(message)
    this.name = 'CampaignGenerationSchemaError'
    this.failedAttempts = failedAttempts
  }
}

/** Per-attempt payload when a stage exhausts schema retries. */
export type GenerationSchemaFailureReason = 'unparseable' | 'normalize_failed' | 'invalid'

export interface GenerationSchemaFailureAttempt {
  attempt: number
  raw: string
  reason: GenerationSchemaFailureReason
}

/** Cap logged / attached raw bodies so local model dumps cannot blow the log. */
export const SCHEMA_FAILURE_RAW_LOG_MAX_CHARS = 4000

export function truncateSchemaFailureRaw(raw: string): string {
  if (raw.length <= SCHEMA_FAILURE_RAW_LOG_MAX_CHARS) {
    return raw
  }
  return `${raw.slice(0, SCHEMA_FAILURE_RAW_LOG_MAX_CHARS)}…[truncated ${raw.length - SCHEMA_FAILURE_RAW_LOG_MAX_CHARS} chars]`
}

export function formatSchemaFailureAttemptsLog(
  error: CampaignGenerationSchemaError
): string | undefined {
  if (error.failedAttempts.length === 0) {
    return undefined
  }
  const lines = error.failedAttempts.map((entry) => {
    const body = truncateSchemaFailureRaw(entry.raw)
    return `attempt ${entry.attempt}/${error.failedAttempts.length} reason=${entry.reason}\n${body}`
  })
  return [`Campaign generation schema failure details (${error.message}):`, ...lines].join(
    '\n---\n'
  )
}

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
  /** Voice specimen — set by post-pass speaking-style generation for speakers (092). */
  speakingStyleSpecimen?: string | null
  /** 2–3 example lines — set by post-pass speaking-style generation for speakers (092). */
  speakingStyleExamples?: string[] | null
  hairColor?: string | null
  age?: string | null
  eyeColor?: string | null
  /** Optional faction roster key from create/flagged generation (125.4). */
  factionKey?: string
  /** Optional membership role string (e.g. acolyte, captain). */
  membershipRole?: string
}

export interface NpcCoreBundle {
  canSpeak: boolean
  temperament: Temperament
  raceKey?: string
  genderKey?: string
  alignment?: Alignment
  classKey?: string
  backgroundKey?: string
  hairColor?: string | null
  age?: string | null
  eyeColor?: string | null
}

export interface GeneratedStoryThread {
  title: string
  state: string
  summary: string
}

/** Slim LLM foe proposal for the prepped bestiary stage (116.6). Stats via retrieve-first later. */
export interface GeneratedBestiaryFoe {
  name: string
  lore: string
  buckets?: Bucket[]
  tags?: string[]
}

export interface GeneratedBestiaryRoster {
  foes: GeneratedBestiaryFoe[]
}

export interface GeneratedWorld {
  worldName: string
  worldSummary: string
  worldHistory: string
}

/** Known places/characters/deities recalled from a recognizable premise setting. Empty when original. */
export interface CanonRecall {
  recognizedSetting: boolean
  settingLabel: string
  knownPlaces: string[]
  knownCharacters: string[]
  knownDeities: string[]
}

export const EMPTY_CANON_RECALL: CanonRecall = {
  recognizedSetting: false,
  settingLabel: '',
  knownPlaces: [],
  knownCharacters: [],
  knownDeities: []
}

export interface GeneratedDeity {
  name: string
  epithet: string
  domains: string[]
  tenets: string[]
  blurb: string
  isForgotten: boolean
}

export interface GeneratedPantheon {
  pantheonSummary: string
  deities: GeneratedDeity[]
}

export interface GeneratedFaction {
  key: string
  name: string
  kind: FactionKind
  summary: string
  motivation?: string
  publicFace?: string
  methods?: string
  deityName?: string
  sortOrder?: number
}

export interface GeneratedFactionRelation {
  factionAKey: string
  factionBKey: string
  stance: FactionRelationStance
  summary?: string
}

export interface GeneratedFactions {
  factionPressure: FactionPressure
  factionsSummary: string
  factions: GeneratedFaction[]
  relations: GeneratedFactionRelation[]
}

export interface WorldContext {
  worldName: string
  worldSummary: string
  worldHistory: string
}

export interface CampaignGenerationResult {
  world: GeneratedWorld
  pantheon: GeneratedPantheon
  factions: GeneratedFactions
  regions: GeneratedRegion[]
  npcs: GeneratedNpc[]
  bestiary: GeneratedBestiaryRoster
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
  deities?: GeneratedDeity[]
}

export interface PersistRegionWithNpcsInput {
  db: Database.Database
  provider: Provider
  campaignId: string
  generatedRegion: GeneratedRegion
  generatedNpcs: GeneratedNpc[]
  /** When set, NPC names matched case-insensitively receive a fandom speaking-style hint. */
  knownCharacters?: string[]
  settingLabel?: string
}

export interface PersistGeneratedCampaignOptions {
  knownCharacters?: string[]
  settingLabel?: string
}

export interface CampaignSetupInput {
  name: string
  premisePrompt: string
  deathMode: DeathMode
  respawnRules?: RespawnRules | null
  regionCount?: number
  npcsPerRegion?: number
  generativeTokensEnabled?: boolean
  npcFaceTokenGenerationEnabled?: boolean
  enemyTokenGenerationEnabled?: boolean
}
