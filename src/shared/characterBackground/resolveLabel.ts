import { findBackgroundRosterEntry } from '../../engine/characterBackground/roster'

export function resolveBackgroundDisplayLabel(backgroundKey: string | null | undefined): string | null {
  if (!backgroundKey) {
    return null
  }
  return findBackgroundRosterEntry(backgroundKey)?.label ?? null
}
