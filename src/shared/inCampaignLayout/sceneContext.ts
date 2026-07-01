import type { DmLineKind, PlayLogEntry } from '../../main/narrationLog'

export function pickCurrentSceneText(
  entries: PlayLogEntry[],
  persistedScene?: string | null
): string | null {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index]
    if (entry?.speaker === 'dm' && entry.dmLineKind === 'scene') {
      return entry.text
    }
  }
  const trimmed = persistedScene?.trim()
  return trimmed ? trimmed : null
}

export function filterDmFlavorEntries(entries: PlayLogEntry[]): PlayLogEntry[] {
  return entries.filter(
    (entry) =>
      entry.speaker === 'dm' &&
      (entry.dmLineKind === 'flavor' || entry.dmLineKind === undefined)
  )
}

export function filterConversationEntries(entries: PlayLogEntry[]): PlayLogEntry[] {
  return entries.filter(
    (entry) =>
      entry.speaker === 'npc' ||
      entry.speaker === 'partyMember' ||
      entry.speaker === 'player'
  )
}

/** @deprecated Use filterDmFlavorEntries */
export const filterDmExpositionEntries = filterDmFlavorEntries

/** @deprecated Use filterConversationEntries */
export const filterPlayerInteractionEntries = filterConversationEntries

export type { DmLineKind }
