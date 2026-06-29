import type { PlayLogEntry } from '../../main/narrationLog'

export function pickCurrentSceneText(entries: PlayLogEntry[]): string | null {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index]
    if (entry?.speaker === 'dm') {
      return entry.text
    }
  }
  return null
}

export function filterDmExpositionEntries(entries: PlayLogEntry[]): PlayLogEntry[] {
  return entries.filter((entry) => entry.speaker !== 'player')
}

export function filterPlayerInteractionEntries(entries: PlayLogEntry[]): PlayLogEntry[] {
  return entries.filter((entry) => entry.speaker === 'player')
}
