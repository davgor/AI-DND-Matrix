import type { PlayLogEntry } from '../../../main/narrationLog'

export function appendOptimisticPlayerMessage(playerInput: string): PlayLogEntry | null {
  const text = playerInput.trim()
  if (!text) {
    return null
  }
  return {
    id: `optimistic-${Date.now()}`,
    timestamp: new Date().toISOString(),
    speaker: 'player',
    text,
    playerLineKind: 'raw'
  }
}

export function mergeOptimisticIntoLog(
  persisted: PlayLogEntry[],
  optimistic: PlayLogEntry | null
): PlayLogEntry[] {
  if (!optimistic) {
    return persisted
  }
  const alreadyPersisted = persisted.some(
    (entry) =>
      entry.speaker === 'player' &&
      entry.playerLineKind === 'raw' &&
      entry.text === optimistic.text
  )
  if (alreadyPersisted) {
    return persisted
  }
  return [...persisted, optimistic]
}
