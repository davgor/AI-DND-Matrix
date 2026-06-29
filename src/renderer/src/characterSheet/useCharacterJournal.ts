import { useCallback, useEffect, useState } from 'react'
import type { CharacterJournalEntry } from '../../../shared/journal/types'

export function useCharacterJournal(characterId: string): {
  entries: CharacterJournalEntry[]
  refresh: () => Promise<void>
} {
  const [entries, setEntries] = useState<CharacterJournalEntry[]>([])

  const refresh = useCallback(async () => {
    setEntries(await window.characters.listJournalEntries(characterId))
  }, [characterId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { entries, refresh }
}
