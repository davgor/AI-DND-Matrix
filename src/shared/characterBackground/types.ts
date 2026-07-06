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

export interface BackgroundGenerateStoryInput {
  campaignId: string
  characterId: string
  backgroundKey: string
  playerPrompt?: string
}

export interface BackgroundApplyInput {
  campaignId: string
  characterId: string
  backgroundKey: string
  backgroundStory: string
}

export type BackgroundApplyResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_phase' | 'invalid_background_key' | 'character_not_found' }

export function isBackgroundKey(value: unknown): value is BackgroundKey {
  return typeof value === 'string' && (BACKGROUND_KEYS as readonly string[]).includes(normalizeBackgroundKey(value))
}

export function parseBackgroundKey(value: unknown): BackgroundKey | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const normalized = normalizeBackgroundKey(value)
  return (BACKGROUND_KEYS as readonly string[]).includes(normalized)
    ? (normalized as BackgroundKey)
    : undefined
}

function normalizeBackgroundKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/'/g, '')
}
