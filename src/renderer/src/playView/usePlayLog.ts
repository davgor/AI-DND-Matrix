import { useEffect, useState } from 'react'
import type { PlayLogEntry } from '../../../main/narrationLog'
import {
  appendOptimisticPlayerMessage,
  mergeOptimisticIntoLog
} from './optimisticSocialMessage'

export interface PlayLogController {
  log: PlayLogEntry[]
  refreshLog: () => Promise<PlayLogEntry[]>
  appendOptimisticPlayerInput: (playerInput: string) => void
}

export function usePlayLog(
  campaignId: string,
  characterId: string,
  onInitialLoad?: (entries: PlayLogEntry[]) => void
): PlayLogController {
  const [persistedLog, setPersistedLog] = useState<PlayLogEntry[]>([])
  const [optimistic, setOptimistic] = useState<PlayLogEntry | null>(null)

  async function refreshLog(): Promise<PlayLogEntry[]> {
    const entries = await window.campaigns.getNarrationLog(campaignId, characterId)
    setPersistedLog(entries)
    setOptimistic((current) => {
      if (!current) {
        return null
      }
      const merged = mergeOptimisticIntoLog(entries, current)
      return merged === entries ? null : current
    })
    return entries
  }

  function appendOptimisticPlayerInput(playerInput: string): void {
    const entry = appendOptimisticPlayerMessage(playerInput)
    if (entry) {
      setOptimistic(entry)
    }
  }

  useEffect(() => {
    void refreshLog().then((entries) => onInitialLoad?.(entries))
  }, [campaignId, characterId])

  return {
    log: mergeOptimisticIntoLog(persistedLog, optimistic),
    refreshLog,
    appendOptimisticPlayerInput
  }
}
