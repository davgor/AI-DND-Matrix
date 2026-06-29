import type { CampaignSetupFormValues, CreateCampaignRequest, DeathMode, RespawnRules } from './types'
import { DEFAULT_CAMPAIGN_SETUP_FORM } from './types'

const VALID_DEATH_MODES: DeathMode[] = ['legendary', 'standard', 'respawn']
const DEFAULT_NAME_LENGTH = 40

export function defaultCampaignName(premisePrompt: string): string {
  return premisePrompt.trim().slice(0, DEFAULT_NAME_LENGTH)
}

function buildRespawnRules(form: CampaignSetupFormValues): RespawnRules | null {
  if (form.deathMode !== 'respawn') {
    return null
  }
  if (!form.respawnLocation.trim()) {
    return null
  }
  return {
    location: form.respawnLocation.trim(),
    cost: form.respawnCost,
    limit: form.respawnLimit === '' ? null : form.respawnLimit
  }
}

export function validateCampaignSetupForm(form: CampaignSetupFormValues): string | null {
  if (!form.premisePrompt.trim()) {
    return 'Describe your campaign premise before continuing.'
  }
  if (form.deathMode === 'respawn' && !buildRespawnRules(form)) {
    return 'Respawn mode requires a location (and optional cost/limit).'
  }
  return null
}

export function mapFormToCreateRequest(
  form: CampaignSetupFormValues,
  sessionId: string
): CreateCampaignRequest {
  const premisePrompt = form.premisePrompt.trim()
  const name = form.name.trim() || defaultCampaignName(premisePrompt)
  return {
    sessionId,
    premisePrompt,
    name,
    deathMode: form.deathMode,
    respawnRules: buildRespawnRules(form)
  }
}

export function isValidDeathMode(value: unknown): value is DeathMode {
  return typeof value === 'string' && VALID_DEATH_MODES.includes(value as DeathMode)
}

export function isValidCreateCampaignRequest(value: unknown): value is CreateCampaignRequest {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  if (typeof candidate['sessionId'] !== 'string' || typeof candidate['premisePrompt'] !== 'string') {
    return false
  }
  if (!candidate['premisePrompt'].trim()) {
    return false
  }
  if (candidate['deathMode'] !== undefined && !isValidDeathMode(candidate['deathMode'])) {
    return false
  }
  if (candidate['name'] !== undefined && typeof candidate['name'] !== 'string') {
    return false
  }
  return true
}

export function normalizeFormValues(values?: Partial<CampaignSetupFormValues>): CampaignSetupFormValues {
  return { ...DEFAULT_CAMPAIGN_SETUP_FORM, ...values }
}
