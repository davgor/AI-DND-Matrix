import type {
  BackgroundApplyInput,
  BackgroundApplyResult,
  BackgroundGenerateStoryInput,
  BackgroundRosterEntry
} from './types'
import {
  CUSTOM_BACKGROUND_KEY,
  isCustomBackgroundKey,
  normalizeCustomBackgroundLabel,
  parseBackgroundKey
} from './types'

export type { BackgroundApplyInput, BackgroundApplyResult, BackgroundGenerateStoryInput }

export function normalizeBackgroundStory(story: string): string | null {
  const trimmed = story.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function resolveBackgroundRosterEntry(
  roster: BackgroundRosterEntry[],
  backgroundKey: string
): BackgroundRosterEntry | undefined {
  const parsed = parseBackgroundKey(backgroundKey)
  if (!parsed) {
    return undefined
  }
  return roster.find((entry) => entry.key === parsed)
}

export const CUSTOM_BACKGROUND_DESCRIPTION =
  'A background you invent — identity flavor only, not a mechanical power budget.'

export function validateBackgroundApplyFields(input: {
  backgroundKey: string
  backgroundCustomLabel?: string | null
}): { ok: true; key: string; customLabel: string | null } | { ok: false; reason: 'invalid_background_key' | 'invalid_custom_label' } {
  if (isCustomBackgroundKey(input.backgroundKey)) {
    const customLabel = normalizeCustomBackgroundLabel(input.backgroundCustomLabel)
    if (!customLabel) {
      return { ok: false, reason: 'invalid_custom_label' }
    }
    return { ok: true, key: CUSTOM_BACKGROUND_KEY, customLabel }
  }
  const parsed = parseBackgroundKey(input.backgroundKey)
  if (!parsed) {
    return { ok: false, reason: 'invalid_background_key' }
  }
  return { ok: true, key: parsed, customLabel: null }
}
