import { useCallback, useEffect, useState } from 'react'
import type { LogEntry } from '../../../shared/logBook/types'

export function useCharacterLogBook(characterId: string, isOpen: boolean): {
  entries: LogEntry[]
  loading: boolean
} {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setEntries(await window.characters.listLogEntries(characterId))
    } finally {
      setLoading(false)
    }
  }, [characterId])

  useEffect(() => {
    if (isOpen) {
      void refresh()
    }
  }, [isOpen, refresh])

  return { entries, loading }
}
