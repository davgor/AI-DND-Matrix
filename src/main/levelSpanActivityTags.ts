import type { ActivityTag } from '../shared/progression/types'

const TAG_SET = new Set<ActivityTag>(['combat', 'arcane', 'social', 'exploration'])

function tagFromExplicit(payload: Record<string, unknown>): ActivityTag | null {
  const explicit = payload.activityTag
  return typeof explicit === 'string' && TAG_SET.has(explicit as ActivityTag)
    ? (explicit as ActivityTag)
    : null
}

function tagFromPayloadTags(payload: Record<string, unknown>): ActivityTag | null {
  const tags = payload.tags
  if (!Array.isArray(tags)) {
    return null
  }
  for (const tag of tags) {
    if (typeof tag === 'string' && TAG_SET.has(tag as ActivityTag)) {
      return tag as ActivityTag
    }
  }
  return null
}

export function inferActivityTag(event: { type: string; payload: Record<string, unknown> }): ActivityTag | null {
  const explicit = tagFromExplicit(event.payload)
  if (explicit) {
    return explicit
  }
  if (event.type === 'combat_attack' || event.type === 'combat_ended') {
    return 'combat'
  }
  if (event.type === 'player_action') {
    return tagFromPayloadTags(event.payload)
  }
  return null
}

export function inferTagsFromSnippet(snippet: string): ActivityTag[] {
  const lower = snippet.toLowerCase()
  const tags: ActivityTag[] = []
  if (lower.includes('library') || lower.includes('spell') || lower.includes('arcane')) {
    tags.push('arcane')
  }
  if (lower.includes('fight') || lower.includes('battle') || lower.includes('combat')) {
    tags.push('combat')
  }
  return tags
}

export function summarizeEvent(event: { type: string; payload: Record<string, unknown> }): string {
  if (typeof event.payload.narrationText === 'string') {
    return event.payload.narrationText.slice(0, 120)
  }
  if (typeof event.payload.playerInput === 'string') {
    return event.payload.playerInput.slice(0, 120)
  }
  return event.type
}
