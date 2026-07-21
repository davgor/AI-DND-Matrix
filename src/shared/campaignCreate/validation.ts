import type { CampaignSetupFormValues, CreateCampaignRequest, DeathMode, RespawnRules } from './types'
import {
  DEFAULT_CAMPAIGN_SETUP_FORM,
  DEFAULT_NPCS_PER_REGION,
  DEFAULT_REGION_COUNT,
  MAX_NPCS_PER_REGION,
  MAX_REGION_COUNT,
  MIN_NPCS_PER_REGION,
  MIN_REGION_COUNT
} from './types'

const VALID_DEATH_MODES: DeathMode[] = ['legendary', 'standard', 'respawn']
const DEFAULT_NAME_LENGTH = 40

export function defaultCampaignName(premisePrompt: string): string {
  return premisePrompt.trim().slice(0, DEFAULT_NAME_LENGTH)
}

export function clampRegionCount(value: number): number {
  return Math.min(MAX_REGION_COUNT, Math.max(MIN_REGION_COUNT, Math.trunc(value)))
}

export function clampNpcsPerRegion(value: number): number {
  return Math.min(MAX_NPCS_PER_REGION, Math.max(MIN_NPCS_PER_REGION, Math.trunc(value)))
}

export function resolveRegionCount(value: unknown): number {
  if (value === undefined) {
    return DEFAULT_REGION_COUNT
  }
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return Number.NaN
  }
  return value
}

export function resolveNpcsPerRegion(value: unknown): number {
  if (value === undefined) {
    return DEFAULT_NPCS_PER_REGION
  }
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return Number.NaN
  }
  return value
}

function isInRegionCountBounds(value: number): boolean {
  return value >= MIN_REGION_COUNT && value <= MAX_REGION_COUNT
}

function isInNpcsPerRegionBounds(value: number): boolean {
  return value >= MIN_NPCS_PER_REGION && value <= MAX_NPCS_PER_REGION
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
  if (!isInRegionCountBounds(form.regionCount)) {
    return `Regions to generate must be an integer from ${MIN_REGION_COUNT} to ${MAX_REGION_COUNT}.`
  }
  if (!isInNpcsPerRegionBounds(form.npcsPerRegion)) {
    return `NPCs per region must be an integer from ${MIN_NPCS_PER_REGION} to ${MAX_NPCS_PER_REGION}.`
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
    respawnRules: buildRespawnRules(form),
    regionCount: form.regionCount,
    npcsPerRegion: form.npcsPerRegion,
    npcFaceTokenGenerationEnabled: form.npcFaceTokenGenerationEnabled === true
  }
}

export function isValidDeathMode(value: unknown): value is DeathMode {
  return typeof value === 'string' && VALID_DEATH_MODES.includes(value as DeathMode)
}

function isValidGenerationCount(
  value: unknown,
  resolve: (value: unknown) => number,
  isInBounds: (value: number) => boolean
): boolean {
  const resolved = resolve(value)
  return !Number.isNaN(resolved) && isInBounds(resolved)
}

function hasValidCreateCampaignCore(candidate: Record<string, unknown>): boolean {
  if (typeof candidate['sessionId'] !== 'string' || typeof candidate['premisePrompt'] !== 'string') {
    return false
  }
  if (!candidate['premisePrompt'].trim()) {
    return false
  }
  if (candidate['deathMode'] !== undefined && !isValidDeathMode(candidate['deathMode'])) {
    return false
  }
  if (
    candidate['npcFaceTokenGenerationEnabled'] !== undefined &&
    typeof candidate['npcFaceTokenGenerationEnabled'] !== 'boolean'
  ) {
    return false
  }
  return candidate['name'] === undefined || typeof candidate['name'] === 'string'
}

export function isValidCreateCampaignRequest(value: unknown): value is CreateCampaignRequest {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  if (!hasValidCreateCampaignCore(candidate)) {
    return false
  }
  if (!isValidGenerationCount(candidate['regionCount'], resolveRegionCount, isInRegionCountBounds)) {
    return false
  }
  return isValidGenerationCount(
    candidate['npcsPerRegion'],
    resolveNpcsPerRegion,
    isInNpcsPerRegionBounds
  )
}

export function normalizeFormValues(values?: Partial<CampaignSetupFormValues>): CampaignSetupFormValues {
  const merged = { ...DEFAULT_CAMPAIGN_SETUP_FORM, ...values }
  return {
    ...merged,
    regionCount: clampRegionCount(merged.regionCount),
    npcsPerRegion: clampNpcsPerRegion(merged.npcsPerRegion)
  }
}
