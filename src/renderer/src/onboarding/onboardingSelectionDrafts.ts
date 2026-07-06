import type { BackgroundSelectionState } from '../backgroundSelection/backgroundSelectionLogic'
import type { RaceSelectionState } from '../raceSelection/raceSelectionLogic'

const RACE_DRAFT_PREFIX = 'onboarding-race-draft:'
const BACKGROUND_DRAFT_PREFIX = 'onboarding-background-draft:'

function readDraft<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) {
      return null
    }
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeDraft<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore quota or privacy-mode failures.
  }
}

function clearDraft(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // Ignore.
  }
}

export function readRaceSelectionDraft(characterId: string): RaceSelectionState | null {
  return readDraft<RaceSelectionState>(`${RACE_DRAFT_PREFIX}${characterId}`)
}

export function writeRaceSelectionDraft(characterId: string, state: RaceSelectionState): void {
  writeDraft(`${RACE_DRAFT_PREFIX}${characterId}`, state)
}

export function clearRaceSelectionDraft(characterId: string): void {
  clearDraft(`${RACE_DRAFT_PREFIX}${characterId}`)
}

export function readBackgroundSelectionDraft(characterId: string): BackgroundSelectionState | null {
  return readDraft<BackgroundSelectionState>(`${BACKGROUND_DRAFT_PREFIX}${characterId}`)
}

export function writeBackgroundSelectionDraft(characterId: string, state: BackgroundSelectionState): void {
  writeDraft(`${BACKGROUND_DRAFT_PREFIX}${characterId}`, state)
}

export function clearBackgroundSelectionDraft(characterId: string): void {
  clearDraft(`${BACKGROUND_DRAFT_PREFIX}${characterId}`)
}
