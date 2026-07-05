import type { RaceRosterGroup } from '../../../main/raceIpc'
import type { RaceSelectionState } from './raceSelectionLogic'

export function lorePanelTitle(state: RaceSelectionState, roster: RaceRosterGroup[]): string {
  if (state.kind === 'custom') {
    return `What "${state.customLabel.trim() || 'Custom race'}" means in this land`
  }
  if (!state.raceKey) {
    return 'What this race means in this land'
  }
  const label =
    roster.flatMap((group) => group.entries).find((entry) => entry.key === state.raceKey)?.label ??
    state.raceKey
  return `What "${label}" means in this land`
}
