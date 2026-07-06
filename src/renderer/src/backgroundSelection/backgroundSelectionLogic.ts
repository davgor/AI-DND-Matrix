import type { BackgroundRosterEntry } from '../../../shared/characterBackground/types'

export interface BackgroundSelectionState {
  backgroundKey: string | null
  story: string
}

export function initialBackgroundSelectionState(): BackgroundSelectionState {
  return { backgroundKey: null, story: '' }
}

export function selectBackground(
  state: BackgroundSelectionState,
  entry: BackgroundRosterEntry
): BackgroundSelectionState {
  return { ...state, backgroundKey: entry.key }
}

export function canConfirmBackgroundSelection(state: BackgroundSelectionState): boolean {
  return Boolean(state.backgroundKey)
}

export function descriptionForSelection(
  roster: BackgroundRosterEntry[],
  backgroundKey: string | null
): string {
  if (!backgroundKey) {
    return ''
  }
  return roster.find((entry) => entry.key === backgroundKey)?.description ?? ''
}

export function hydrateBackgroundSelectionState(
  backgroundKey: string | null | undefined,
  backgroundStory: string | null | undefined
): BackgroundSelectionState | null {
  if (!backgroundKey) {
    return null
  }
  return {
    backgroundKey,
    story: backgroundStory ?? ''
  }
}

export function resolveInitialBackgroundSelectionState(
  savedBackgroundKey: string | null | undefined,
  savedBackgroundStory: string | null | undefined,
  draft: BackgroundSelectionState | null
): BackgroundSelectionState {
  const hydrated = hydrateBackgroundSelectionState(savedBackgroundKey, savedBackgroundStory)
  if (hydrated) {
    return hydrated
  }
  return draft ?? initialBackgroundSelectionState()
}
