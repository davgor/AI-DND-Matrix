import { useCallback, useState } from 'react'
import type { GuidedCreationState } from '../../../shared/guidedCreation/types'
import type { GuidedRefresh } from './guidedIdentityKickoff'

export function useGuidedRefresh(characterId: string): {
  state: GuidedCreationState | null
  loading: boolean
  refresh: GuidedRefresh
} {
  const [state, setState] = useState<GuidedCreationState | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh: GuidedRefresh = useCallback(
    async (options) => {
      if (!options?.silent) {
        setLoading(true)
      }
      try {
        setState((await window.guidedCreation.getState(characterId)) ?? null)
      } finally {
        if (!options?.silent) {
          setLoading(false)
        }
      }
    },
    [characterId]
  )

  return { state, loading, refresh }
}
