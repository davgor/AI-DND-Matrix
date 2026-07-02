import { useCallback, useEffect, useState } from 'react'
import type { LogEntry } from '../../../shared/logBook/types'
import { LOG_CATEGORIES, type LogCategory } from '../../../shared/logBook/types'

export function useCharacterLogBook(
  characterId: string,
  isOpen: boolean,
  refreshToken = 0
): {
  entries: LogEntry[]
  loading: boolean
  refresh: () => Promise<void>
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
  }, [isOpen, refresh, refreshToken])

  return { entries, loading, refresh }
}

export function filterLogEntries(
  entries: LogEntry[],
  query: string,
  category: LogCategory | 'all'
): LogEntry[] {
  const normalized = query.trim().toLowerCase()
  return entries.filter((entry) => {
    if (category !== 'all' && entry.category !== category) {
      return false
    }
    if (!normalized) {
      return true
    }
    return (
      entry.title.toLowerCase().includes(normalized) || entry.content.toLowerCase().includes(normalized)
    )
  })
}

export function resolveRelatedEntityLabel(
  relatedEntityId: string | null,
  entries: LogEntry[]
): string | null {
  if (!relatedEntityId) {
    return null
  }
  const match = entries.find((entry) => entry.id === relatedEntityId || entry.relatedEntityId === relatedEntityId)
  return match?.title ?? relatedEntityId
}

export const LOG_FILTER_CHIPS: Array<{ id: LogCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  ...LOG_CATEGORIES.map((category) => ({ id: category, label: category }))
]
