export interface TaggedEvent {
  tag: string
}

export interface ArchetypeKit {
  kitTags: string[]
}

export interface EmergentDirectionCandidate {
  tag: string
  count: number
}

export const EMERGENT_DIRECTION_THRESHOLD = 3

export function detectEmergentDirection(
  character: ArchetypeKit,
  recentEvents: TaggedEvent[]
): EmergentDirectionCandidate | null {
  const counts = new Map<string, number>()
  for (const event of recentEvents) {
    if (character.kitTags.includes(event.tag)) {
      continue
    }
    counts.set(event.tag, (counts.get(event.tag) ?? 0) + 1)
  }

  let best: EmergentDirectionCandidate | null = null
  for (const [tag, count] of counts) {
    if (count >= EMERGENT_DIRECTION_THRESHOLD && (best === null || count > best.count)) {
      best = { tag, count }
    }
  }
  return best
}
