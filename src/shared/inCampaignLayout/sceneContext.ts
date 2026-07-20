import type { PlayLogEntry } from '../../main/narrationLog'

export interface SceneSummaryInput {
  regionName?: string | null
  regionBlurb?: string | null
}

function latestSceneSettingText(entries: PlayLogEntry[]): string | null {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index]
    if (entry?.speaker !== 'dm' || entry.sceneSetting !== true) {
      continue
    }
    if (typeof entry.text === 'string' && entry.text.length > 0) {
      return entry.text
    }
  }
  return null
}

function quietSceneFallback(context: SceneSummaryInput): string {
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

export function pickSceneSummary(
  entries: PlayLogEntry[],
  context: SceneSummaryInput = {}
): string {
  return latestSceneSettingText(entries) ?? quietSceneFallback(context)
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

/**
 * Chat-style Social column: player typed lines + NPC/party lines (dialogue or action).
 * Player actionExpression restatements (e.g. “X says …”) stay out of both columns —
 * Scene is DM flavor only; Social shows the player's own words via `raw` lines.
 */
function isSocialLogEntry(entry: PlayLogEntry): boolean {
  if (entry.speaker === 'player') {
    return entry.playerLineKind !== 'actionExpression'
  }
  return entry.speaker === 'npc' || entry.speaker === 'partyMember'
}

/** Scene feed: DM flavor / narration only — never player words. */
export function filterDmExpositionEntries(entries: PlayLogEntry[]): PlayLogEntry[] {
  return entries.filter((entry) => entry.speaker === 'dm')
}

export function filterSocialEntries(entries: PlayLogEntry[]): PlayLogEntry[] {
  return entries.filter(isSocialLogEntry)
}
