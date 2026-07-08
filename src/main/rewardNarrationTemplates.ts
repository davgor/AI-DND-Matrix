/**
 * Template one-liners for the default zero-LLM reward path (epic 040.7).
 * Keyed by reward source so encounter and quest beats read differently.
 */
import type { XPSource } from '../shared/progression/types'
import type { LootSource } from '../shared/loot/types'

const XP_NARRATION_BY_SOURCE: Record<XPSource, string> = {
  encounter_end: 'The fight is over, and its hard-won lessons settle in.',
  quest_complete: 'With the task seen through, you come away more seasoned.'
}

export function xpNarrationTemplate(source: XPSource): string {
  return XP_NARRATION_BY_SOURCE[source]
}

export function formatItemNameList(names: string[]): string {
  if (names.length <= 1) {
    return names[0] ?? ''
  }
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

const EMPTY_LOOT_NARRATION_BY_SOURCE: Record<LootSource, string> = {
  encounter_end: 'You search the fallen but find nothing worth taking.',
  quest_complete: 'The task is done, though no tangible reward comes with it.'
}

export function lootNarrationTemplate(source: LootSource, itemNames: string[]): string {
  if (itemNames.length === 0) {
    return EMPTY_LOOT_NARRATION_BY_SOURCE[source]
  }
  const list = formatItemNameList(itemNames)
  return source === 'encounter_end'
    ? `Searching the aftermath, you recover ${list}.`
    : `For seeing the task through, you receive ${list}.`
}
