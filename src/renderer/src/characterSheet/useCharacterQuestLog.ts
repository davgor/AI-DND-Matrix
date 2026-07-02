import { useCallback, useEffect, useState } from 'react'
import type { CharacterQuestView } from '../../../shared/quests/types'

export function useCharacterQuestLog(
  characterId: string,
  isOpen: boolean,
  refreshToken = 0
): {
  entries: CharacterQuestView[]
  loading: boolean
  refresh: () => Promise<void>
} {
  const [entries, setEntries] = useState<CharacterQuestView[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setEntries(await window.quests.listForCharacter(characterId))
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

export function groupQuestViews(entries: CharacterQuestView[]): {
  main: CharacterQuestView | null
  active: CharacterQuestView[]
  available: CharacterQuestView[]
  completed: CharacterQuestView[]
  other: CharacterQuestView[]
} {
  const main = entries.find((row) => row.quest.kind === 'main') ?? null
  const side = entries.filter((row) => row.quest.kind === 'side')
  return {
    main,
    active: side.filter((row) => row.characterQuest.status === 'active'),
    available: side.filter((row) => row.characterQuest.status === 'available'),
    completed: side.filter((row) => row.characterQuest.status === 'completed'),
    other: side.filter(
      (row) => !['active', 'available', 'completed'].includes(row.characterQuest.status)
    )
  }
}

export function countActiveSideQuests(entries: CharacterQuestView[]): number {
  return entries.filter(
    (row) => row.quest.kind === 'side' && row.characterQuest.status === 'active'
  ).length
}
