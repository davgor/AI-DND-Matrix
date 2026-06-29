import { useCallback, useEffect, useState } from 'react'
import type { CharacterItemView } from '../../../shared/items/types'

export function useCharacterInventory(characterId: string): {
  items: CharacterItemView[]
  busyId: string | null
  refresh: () => Promise<void>
  withBusy: <T>(id: string, action: () => Promise<T>) => Promise<T>
} {
  const [items, setItems] = useState<CharacterItemView[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setItems(await window.characters.listItems(characterId))
  }, [characterId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function withBusy<T>(id: string, action: () => Promise<T>): Promise<T> {
    setBusyId(id)
    try {
      return await action()
    } finally {
      setBusyId(null)
    }
  }

  return { items, busyId, refresh, withBusy }
}
