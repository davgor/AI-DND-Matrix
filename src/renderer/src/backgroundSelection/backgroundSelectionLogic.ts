import type { BackgroundRosterEntry } from '../../../shared/characterBackground/types'
import {
  CUSTOM_BACKGROUND_KEY,
  isCustomBackgroundKey,
  normalizeCustomBackgroundLabel
} from '../../../shared/characterBackground/types'
import { CUSTOM_BACKGROUND_DESCRIPTION } from '../../../shared/characterBackground/apply'

export interface BackgroundSelectionState {
  backgroundKey: string | null
  customLabel: string
  story: string
}

export function initialBackgroundSelectionState(): BackgroundSelectionState {
  return { backgroundKey: null, customLabel: '', story: '' }
}

export function selectBackground(
  state: BackgroundSelectionState,
  entry: BackgroundRosterEntry
): BackgroundSelectionState {
  return { ...state, backgroundKey: entry.key, customLabel: '' }
}

export function selectCustomBackground(state: BackgroundSelectionState): BackgroundSelectionState {
  return { ...state, backgroundKey: CUSTOM_BACKGROUND_KEY }
}

export function canConfirmBackgroundSelection(state: BackgroundSelectionState): boolean {
  if (!state.backgroundKey) {
    return false
  }
  if (isCustomBackgroundKey(state.backgroundKey)) {
    return Boolean(normalizeCustomBackgroundLabel(state.customLabel))
  }
  return true
}

export function canGenerateBackgroundStory(props: {
  state: BackgroundSelectionState
  submitting: boolean
  isCustom: boolean
}): boolean {
  return (
    Boolean(props.state.backgroundKey) &&
    !props.submitting &&
    (!props.isCustom || Boolean(props.state.customLabel.trim()))
  )
}

/** Disabled flag for the Generate button — inverse of canGenerateBackgroundStory. */
export function isBackgroundStoryGenerateDisabled(props: {
  state: BackgroundSelectionState
  submitting: boolean
  isCustom: boolean
}): boolean {
  return !canGenerateBackgroundStory(props)
}

export function descriptionForSelection(
  roster: BackgroundRosterEntry[],
  backgroundKey: string | null
): string {
  if (!backgroundKey) {
    return ''
  }
  if (isCustomBackgroundKey(backgroundKey)) {
    return CUSTOM_BACKGROUND_DESCRIPTION
  }
  return roster.find((entry) => entry.key === backgroundKey)?.description ?? ''
}

export function hydrateBackgroundSelectionState(
  backgroundKey: string | null | undefined,
  backgroundStory: string | null | undefined,
  backgroundCustomLabel?: string | null | undefined
): BackgroundSelectionState | null {
  if (!backgroundKey) {
    return null
  }
  return {
    backgroundKey,
    customLabel: backgroundCustomLabel ?? '',
    story: backgroundStory ?? ''
  }
}

export function resolveInitialBackgroundSelectionState(
  savedBackgroundKey: string | null | undefined,
  savedBackgroundStory: string | null | undefined,
  draft: BackgroundSelectionState | null,
  savedCustomLabel?: string | null | undefined
): BackgroundSelectionState {
  const hydrated = hydrateBackgroundSelectionState(
    savedBackgroundKey,
    savedBackgroundStory,
    savedCustomLabel
  )
  if (hydrated) {
    return hydrated
  }
  return draft ?? initialBackgroundSelectionState()
}
