export interface BackgroundRosterEntry {
  key: string
  label: string
  description: string
}

export const BACKGROUND_KEYS = [
  'acolyte',
  'charlatan',
  'criminal',
  'street_thug',
  'entertainer',
  'folk_hero',
  'guild_artisan',
  'hermit',
  'noble',
  'outlander',
  'sage',
  'sailor',
  'soldier',
  'urchin',
  'merchant',
  'farmhand',
  'isekaid'
] as const

export type BackgroundKey = (typeof BACKGROUND_KEYS)[number]

/** Sentinel key for player-minted custom backgrounds (not a roster entry). */
export const CUSTOM_BACKGROUND_KEY = 'custom' as const

export type PlayerBackgroundKey = BackgroundKey | typeof CUSTOM_BACKGROUND_KEY

export interface BackgroundGenerateStoryInput {
  campaignId: string
  characterId: string
  backgroundKey: string
  backgroundCustomLabel?: string
  playerPrompt?: string
}

export interface BackgroundApplyInput {
  campaignId: string
  characterId: string
  backgroundKey: string
  backgroundStory: string
  backgroundCustomLabel?: string | null
}

export type BackgroundApplyResult =
  | { ok: true }
  | {
      ok: false
      reason:
        | 'invalid_phase'
        | 'invalid_background_key'
        | 'invalid_custom_label'
        | 'character_not_found'
    }

export function isCustomBackgroundKey(value: unknown): value is typeof CUSTOM_BACKGROUND_KEY {
  return typeof value === 'string' && normalizeBackgroundKey(value) === CUSTOM_BACKGROUND_KEY
}

export function isPlayerBackgroundKey(value: unknown): value is PlayerBackgroundKey {
  return isBackgroundKey(value) || isCustomBackgroundKey(value)
}

export function normalizeCustomBackgroundLabel(label: string | null | undefined): string | null {
  if (typeof label !== 'string') {
    return null
  }
  const trimmed = label.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function isBackgroundKey(value: unknown): value is BackgroundKey {
  return typeof value === 'string' && (BACKGROUND_KEYS as readonly string[]).includes(normalizeBackgroundKey(value))
}

/** Common invented background labels models emit for village roles. */
const BACKGROUND_ALIASES: Record<string, BackgroundKey> = {
  herbalist: 'hermit',
  healer: 'acolyte',
  gardener: 'farmhand',
  apothecary: 'hermit',
  midwife: 'folk_hero',
  priest: 'acolyte',
  priestess: 'acolyte'
}

export function parseBackgroundKey(value: unknown): BackgroundKey | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const normalized = normalizeBackgroundKey(value)
  if ((BACKGROUND_KEYS as readonly string[]).includes(normalized)) {
    return normalized as BackgroundKey
  }
  return BACKGROUND_ALIASES[normalized]
}

export function normalizeBackgroundKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/'/g, '')
}
