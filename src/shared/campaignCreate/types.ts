/** Initial one-shot campaign generation: region count (review-screen generation uses per-action counts). */
export const MIN_REGION_COUNT = 0
export const MAX_REGION_COUNT = 5
export const DEFAULT_REGION_COUNT = 2

/** Initial one-shot campaign generation: NPCs per region when regionCount > 0. */
export const MIN_NPCS_PER_REGION = 0
export const MAX_NPCS_PER_REGION = 10
export const DEFAULT_NPCS_PER_REGION = 3

/** Per-request NPC count when generating an additional region on review (or hub). */
export const MIN_ADDITIONAL_REGION_NPC_COUNT = 0
export const MAX_ADDITIONAL_REGION_NPC_COUNT = 10
export const DEFAULT_ADDITIONAL_REGION_NPC_COUNT = 3

export type DeathMode = 'legendary' | 'standard' | 'respawn'

export interface RespawnRules {
  location: string
  cost: number
  limit: number | null
}

export type CreateCampaignStage =
  | 'canon'
  | 'pantheon'
  | 'world'
  | 'regions'
  | 'npcs'
  | 'bestiary'
  | 'story'
  | 'persist'

/** Bestiary after npcs so signature foes exist before story hooks; before persist. */
export const CREATE_CAMPAIGN_STAGE_ORDER: readonly CreateCampaignStage[] = [
  'canon',
  'pantheon',
  'world',
  'regions',
  'npcs',
  'bestiary',
  'story',
  'persist'
]
export const CREATE_CAMPAIGN_STAGE_TOTAL = CREATE_CAMPAIGN_STAGE_ORDER.length

export type CreateCampaignFailureCategory = 'validation' | 'generation' | 'persistence' | 'busy' | 'unknown'

export interface CreateCampaignProgress {
  stage: CreateCampaignStage
  stageIndex: number
  stageTotal: number
  statusText: string
}

export type CreateCampaignProgressCallback = (stage: CreateCampaignStage) => void

export interface CreateCampaignRequest {
  sessionId: string
  premisePrompt: string
  name?: string
  deathMode?: DeathMode
  respawnRules?: RespawnRules | null
  /** Initial generation region count (0–5). Defaults to {@link DEFAULT_REGION_COUNT}. */
  regionCount?: number
  /** Initial generation NPCs per region (0–10). Defaults to {@link DEFAULT_NPCS_PER_REGION}. */
  npcsPerRegion?: number
}

export interface CampaignSetupFormValues {
  name: string
  premisePrompt: string
  deathMode: DeathMode
  respawnLocation: string
  respawnCost: number
  respawnLimit: number | ''
  regionCount: number
  npcsPerRegion: number
}

export const DEFAULT_CAMPAIGN_SETUP_FORM: CampaignSetupFormValues = {
  name: '',
  premisePrompt: '',
  deathMode: 'standard',
  respawnLocation: '',
  respawnCost: 0,
  respawnLimit: '',
  regionCount: DEFAULT_REGION_COUNT,
  npcsPerRegion: DEFAULT_NPCS_PER_REGION
}
