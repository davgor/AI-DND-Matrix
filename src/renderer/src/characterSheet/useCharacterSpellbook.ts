import { useCallback, useEffect, useState } from 'react'
import type { KnownSpellView } from '../../../shared/spells/types'

export function useCharacterSpellbook(
  characterId: string,
  isOpen: boolean,
  refreshToken = 0
): {
  spells: KnownSpellView[]
  loading: boolean
  refresh: () => Promise<void>
} {
  const [spells, setSpells] = useState<KnownSpellView[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setSpells(await window.spellbook.listForCharacter(characterId))
    } finally {
      setLoading(false)
    }
  }, [characterId])

  useEffect(() => {
    if (isOpen) {
      void refresh()
    }
  }, [isOpen, refresh, refreshToken])

  return { spells, loading, refresh }
}
