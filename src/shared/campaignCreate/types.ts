export type DeathMode = 'legendary' | 'standard' | 'respawn'

export interface RespawnRules {
  location: string
  cost: number
  limit: number | null
}

export type CreateCampaignStage = 'request' | 'parse' | 'persist'

export const CREATE_CAMPAIGN_STAGE_ORDER: readonly CreateCampaignStage[] = ['request', 'parse', 'persist']
export const CREATE_CAMPAIGN_STAGE_TOTAL = CREATE_CAMPAIGN_STAGE_ORDER.length

export type CreateCampaignFailureCategory = 'validation' | 'generation' | 'persistence' | 'busy' | 'unknown'

export interface CreateCampaignProgress {
  stage: CreateCampaignStage
  stageIndex: number
  stageTotal: number
  statusText: string
}

export interface CreateCampaignRequest {
  sessionId: string
  premisePrompt: string
  name?: string
  deathMode?: DeathMode
  respawnRules?: RespawnRules | null
}

export interface CampaignSetupFormValues {
  name: string
  premisePrompt: string
  deathMode: DeathMode
  respawnLocation: string
  respawnCost: number
  respawnLimit: number | ''
}

export const DEFAULT_CAMPAIGN_SETUP_FORM: CampaignSetupFormValues = {
  name: '',
  premisePrompt: '',
  deathMode: 'standard',
  respawnLocation: '',
  respawnCost: 0,
  respawnLimit: ''
}
