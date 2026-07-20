import type { PlayLogEntry } from '../../../../main/narrationLog'

export function isSceneSettingEntry(entry: PlayLogEntry): boolean {
  return entry.sceneSetting === true
}

export function isNpcDialogueEntry(entry: PlayLogEntry): boolean {
  return entry.speaker === 'npc' && entry.reactionKind === 'dialogue'
}

export function entryIds(entries: readonly PlayLogEntry[]): string[] {
  return entries.map((entry) => entry.id)
}

export function eligibleHighlightIds(
  entries: readonly PlayLogEntry[],
  isEligible: (entry: PlayLogEntry) => boolean
): string[] {
  return entries.filter(isEligible).map((entry) => entry.id)
}
