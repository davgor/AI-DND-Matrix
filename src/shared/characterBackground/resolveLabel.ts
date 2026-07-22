import { findBackgroundRosterEntry } from '../../engine/characterBackground/roster'
import { isCustomBackgroundKey, normalizeCustomBackgroundLabel } from './types'

export function resolveBackgroundDisplayLabel(
  backgroundKey: string | null | undefined,
  customLabel?: string | null
): string | null {
  if (!backgroundKey) {
    return null
  }
  if (isCustomBackgroundKey(backgroundKey)) {
    return normalizeCustomBackgroundLabel(customLabel)
  }
  return findBackgroundRosterEntry(backgroundKey)?.label ?? null
}
