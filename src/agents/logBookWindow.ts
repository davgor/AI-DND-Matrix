import type { LogCategory, LogEntry } from '../shared/logBook/types'

export const LOG_ENTRIES_PER_CATEGORY_LIMIT = 5

export interface LogBookSceneContext {
  regionId: string
  presentNpcIds: string[]
}

function relevanceScore(entry: LogEntry, scene: LogBookSceneContext): number {
  if (!entry.relatedEntityId) {
    return 0
  }
  if (entry.category === 'place' && entry.relatedEntityId === scene.regionId) {
    return 2
  }
  if (entry.category === 'person' && scene.presentNpcIds.includes(entry.relatedEntityId)) {
    return 2
  }
  if (scene.presentNpcIds.includes(entry.relatedEntityId)) {
    return 1
  }
  if (entry.relatedEntityId === scene.regionId) {
    return 1
  }
  return 0
}

function sortEntriesForScene(a: LogEntry, b: LogEntry, scene: LogBookSceneContext): number {
  const relevanceDelta = relevanceScore(b, scene) - relevanceScore(a, scene)
  if (relevanceDelta !== 0) {
    return relevanceDelta
  }
  return b.learnedInGameDate - a.learnedInGameDate
}

export function windowLogEntriesForNarration(
  entries: LogEntry[],
  scene: LogBookSceneContext,
  limit: number = LOG_ENTRIES_PER_CATEGORY_LIMIT
): LogEntry[] {
  const byCategory = new Map<LogCategory, LogEntry[]>()
  for (const entry of entries) {
    const bucket = byCategory.get(entry.category) ?? []
    bucket.push(entry)
    byCategory.set(entry.category, bucket)
  }

  const windowed: LogEntry[] = []
  for (const category of byCategory.keys()) {
    const sorted = [...(byCategory.get(category) ?? [])].sort((a, b) => sortEntriesForScene(a, b, scene))
    windowed.push(...sorted.slice(0, limit))
  }
  return windowed
}
