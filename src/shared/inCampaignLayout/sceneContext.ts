import type { PlayLogEntry } from '../../main/narrationLog'

export interface SceneSummaryInput {
  regionName?: string | null
  regionBlurb?: string | null
}

export function pickSceneSummary(
  entries: PlayLogEntry[],
  context: SceneSummaryInput = {}
): string {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index]
    if (entry?.speaker === 'dm' && entry.sceneSetting === true) {
      return entry.text
    }
  }

  const blurb = context.regionBlurb?.trim()
  if (blurb) {
    return blurb
  }

  const regionName = context.regionName?.trim()
  if (regionName) {
    return `The scene is quiet in ${regionName}…`
  }

  return 'The scene is quiet…'
}

/** @deprecated Use pickSceneSummary — kept for transitional imports only */
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
  return entries.filter(
    (entry) => entry.speaker !== 'player' || entry.playerLineKind === 'actionExpression'
  )
}

export function filterPlayerInteractionEntries(entries: PlayLogEntry[]): PlayLogEntry[] {
  return entries.filter((entry) => entry.speaker === 'player' && entry.playerLineKind !== 'actionExpression')
}
