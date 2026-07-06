import { findRosterEntry } from '../../../engine/raceSelection/roster'
import type { RaceApplyInput } from '../../../shared/raceSelection/types'
import type { RaceSelectionState } from './raceSelectionLogic'

interface PresetApplyFields {
  raceKey: string
  label: string
  seedPrompt: string
}

function presetRaceApplyFields(state: RaceSelectionState): PresetApplyFields | null {
  if (!state.raceKey) {
    return null
  }
  const rosterEntry = findRosterEntry(state.raceKey)
  return {
    raceKey: state.raceKey,
    label: rosterEntry?.label ?? state.raceKey,
    seedPrompt: rosterEntry?.seedPrompt ?? ''
  }
}

export function buildRaceApplyInput(
  campaignId: string,
  characterId: string,
  state: RaceSelectionState
): RaceApplyInput | null {
  if (!state.lore || !state.kind) {
    return null
  }
  if (state.kind === 'preset') {
    const preset = presetRaceApplyFields(state)
    if (!preset) {
      return null
    }
    return {
      campaignId,
      characterId,
      kind: 'preset',
      raceKey: preset.raceKey,
      label: preset.label,
      seedPrompt: preset.seedPrompt,
      finalLore: state.lore
    }
  }
  return {
    campaignId,
    characterId,
    kind: 'custom',
    label: state.customLabel.trim() || 'Custom race',
    seedPrompt: state.customSeedPrompt.trim(),
    finalLore: state.lore
  }
}
