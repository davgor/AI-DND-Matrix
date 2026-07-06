import type {
  BackgroundApplyInput,
  BackgroundApplyResult,
  BackgroundGenerateStoryInput,
  BackgroundRosterEntry
} from './types'
import { parseBackgroundKey } from './types'

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
