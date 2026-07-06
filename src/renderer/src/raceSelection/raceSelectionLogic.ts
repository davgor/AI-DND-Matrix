import { CUSTOM_RACE_KEY, isPresetRaceKey } from '../../../engine/raceSelection/roster'
import type { CampaignRace, RaceLore } from '../../../shared/raceSelection/types'

export type RacePickKind = 'preset' | 'custom'

export interface RaceSelectionState {
  kind: RacePickKind | null
  raceKey: string | null
  customLabel: string
  customSeedPrompt: string
  lore: RaceLore | null
  loreLocked: boolean
}

export function initialRaceSelectionState(): RaceSelectionState {
  return {
    kind: null,
    raceKey: null,
    customLabel: 'Custom race',
    customSeedPrompt: '',
    lore: null,
    loreLocked: false
  }
}

export function isEstablishedPresetRace(campaignRaces: CampaignRace[], raceKey: string): boolean {
  return campaignRaces.some((entry) => entry.raceKey === raceKey && entry.kind === 'preset')
}

export function selectPresetRace(_state: RaceSelectionState, raceKey: string): RaceSelectionState {
  return {
    ...initialRaceSelectionState(),
    kind: 'preset',
    raceKey
  }
}

export function selectCustomRace(_state: RaceSelectionState): RaceSelectionState {
  return {
    ...initialRaceSelectionState(),
    kind: 'custom',
    raceKey: CUSTOM_RACE_KEY
  }
}

export function updateCustomSeed(state: RaceSelectionState, seedPrompt: string): RaceSelectionState {
  return {
    ...state,
    customSeedPrompt: seedPrompt,
    lore: null,
    loreLocked: false
  }
}

export function updateCustomLabel(state: RaceSelectionState, label: string): RaceSelectionState {
  return { ...state, customLabel: label }
}

export function applyLorePreview(
  state: RaceSelectionState,
  result: { locked: boolean; lore: RaceLore }
): RaceSelectionState {
  return {
    ...state,
    lore: result.lore,
    loreLocked: result.locked
  }
}

export function updateLoreField(
  state: RaceSelectionState,
  field: keyof RaceLore,
  value: string | string[]
): RaceSelectionState {
  if (!state.lore || state.loreLocked) {
    return state
  }
  return {
    ...state,
    lore: { ...state.lore, [field]: value }
  }
}

export function canGenerateLore(state: RaceSelectionState): boolean {
  if (!state.kind) {
    return false
  }
  if (state.kind === 'preset') {
    return Boolean(state.raceKey)
  }
  return state.customSeedPrompt.trim().length > 0
}

export function isLoreComplete(lore: RaceLore | null): boolean {
  if (!lore) {
    return false
  }
  return (
    lore.summary.trim().length > 0 &&
    lore.appearance.trim().length > 0 &&
    lore.culture.trim().length > 0 &&
    lore.roleInThisLand.trim().length > 0 &&
    lore.hooks.length > 0 &&
    lore.hooks.every((hook) => hook.trim().length > 0)
  )
}

export function canConfirmRaceSelection(state: RaceSelectionState): boolean {
  if (!state.kind || !state.raceKey) {
    return false
  }
  if (state.kind === 'custom' && !state.customSeedPrompt.trim()) {
    return false
  }
  return isLoreComplete(state.lore)
}

export function isLoreEditable(state: RaceSelectionState): boolean {
  return Boolean(state.lore && !state.loreLocked)
}

export function needsGenerateBeforeLore(state: RaceSelectionState): boolean {
  return Boolean(state.kind && !state.lore)
}

export function showRegenerateControl(state: RaceSelectionState): boolean {
  return Boolean(state.lore && !state.loreLocked)
}

export function hydrateRaceSelectionState(
  raceKey: string | null | undefined,
  campaignRaces: CampaignRace[]
): RaceSelectionState | null {
  if (!raceKey) {
    return null
  }

  const catalog = campaignRaces.find((entry) => entry.raceKey === raceKey)
  if (catalog) {
    return {
      kind: catalog.kind,
      raceKey: catalog.raceKey,
      customLabel: catalog.kind === 'custom' ? catalog.label : 'Custom race',
      customSeedPrompt: catalog.kind === 'custom' ? catalog.seedPrompt : '',
      lore: catalog.lore,
      loreLocked: catalog.kind === 'preset'
    }
  }

  if (isPresetRaceKey(raceKey)) {
    return selectPresetRace(initialRaceSelectionState(), raceKey)
  }

  return null
}

export function resolveInitialRaceSelectionState(
  savedRaceKey: string | null | undefined,
  campaignRaces: CampaignRace[],
  draft: RaceSelectionState | null
): RaceSelectionState {
  const hydrated = hydrateRaceSelectionState(savedRaceKey, campaignRaces)
  if (hydrated) {
    return hydrated
  }
  return draft ?? initialRaceSelectionState()
}
