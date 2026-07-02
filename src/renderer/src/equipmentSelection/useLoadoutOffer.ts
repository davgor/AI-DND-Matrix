import { useEffect, useState } from 'react'
import type { StartingLoadoutOffer } from '../../../shared/startingLoadout/types'
import { initialEquipmentSelectionState, type EquipmentSelectionState } from './equipmentSelectionLogic'
import { loadoutOfferErrorMessage, parseLoadoutOfferResponse } from './parseLoadoutOfferResponse'

function useLoadoutOffer(characterId: string) {
  const [offer, setOffer] = useState<StartingLoadoutOffer | null>(null)
  const [state, setState] = useState<EquipmentSelectionState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!characterId) {
      setError('No character selected for equipment.')
      setLoading(false)
      return
    }
    if (!window.startingLoadout?.getOffer) {
      setError('Equipment loading is unavailable. Restart the app.')
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    void window.startingLoadout
      .getOffer({ characterId })
      .then((result) => {
        if (cancelled) {
          return
        }
        const parsed = parseLoadoutOfferResponse(result)
        if (!parsed.ok) {
          setError(loadoutOfferErrorMessage(parsed))
          return
        }
        setOffer(parsed.offer)
        setState(initialEquipmentSelectionState(parsed.offer))
      })
      .catch(() => {
        if (!cancelled) {
          setError('Equipment loading failed. Restart the app and try again.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [characterId])

  return { offer, state, setState, loading, error, setError }
}

export { useLoadoutOffer }
