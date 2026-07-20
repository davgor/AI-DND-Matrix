import { useCallback, useEffect, useState } from 'react'
import type { NpcDossierDto } from '../../../shared/npcDossier/types'

export function useNpcDossier(
  campaignId: string,
  characterId: string,
  npcId: string | null,
  isOpen: boolean
): {
  dossier: NpcDossierDto | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
} {
  const [dossier, setDossier] = useState<NpcDossierDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!npcId) {
      setDossier(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await window.npcDossier.get({ campaignId, characterId, npcId })
      setDossier(result)
      if (!result) {
        setError('NPC not found.')
      }
    } catch (fetchError) {
      setDossier(null)
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load dossier.')
    } finally {
      setLoading(false)
    }
  }, [campaignId, characterId, npcId])

  useEffect(() => {
    if (isOpen && npcId) {
      void refresh()
    }
  }, [isOpen, npcId, refresh])

  return { dossier, loading, error, refresh }
}
