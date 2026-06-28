import { useEffect, useState } from 'react'
import type { PlayLogEntry } from '../../../main/narrationLog'

export interface PlayLogController {
  log: PlayLogEntry[]
  refreshLog: () => Promise<PlayLogEntry[]>
}

export function usePlayLog(campaignId: string, onInitialLoad: (entries: PlayLogEntry[]) => void): PlayLogController {
  const [log, setLog] = useState<PlayLogEntry[]>([])

  async function refreshLog(): Promise<PlayLogEntry[]> {
    const entries = await window.campaigns.getNarrationLog(campaignId)
    setLog(entries)
    return entries
  }

  useEffect(() => {
    void refreshLog().then(onInitialLoad)
  }, [campaignId])

  return { log, refreshLog }
}
