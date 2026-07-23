import { useEffect, useState } from 'react'
import type {
  AppliedStartingLoadoutSnapshot,
  StartingLoadoutOffer
} from '../../../shared/startingLoadout/types'
import {
  readEquipmentSelectionDraft,
  writeEquipmentSelectionDraft
} from '../onboarding/onboardingSelectionDrafts'
import {
  resolveInitialEquipmentSelectionState,
  type EquipmentSelectionState
} from './equipmentSelectionLogic'
import { loadoutOfferErrorMessage, parseLoadoutOfferResponse } from './parseLoadoutOfferResponse'

type OfferSetters = {
  setOffer: (value: StartingLoadoutOffer | null) => void
  setState: (value: EquipmentSelectionState | null) => void
  setInitialized: (value: boolean) => void
  setLoading: (value: boolean) => void
  setError: (value: string | null) => void
}

function rejectOfferLoad(setters: OfferSetters, message: string): void {
  setters.setError(message)
  setters.setLoading(false)
  setters.setInitialized(false)
}

function applyParsedOffer(
  characterId: string,
  result: unknown,
  setters: Pick<OfferSetters, 'setOffer' | 'setState' | 'setInitialized' | 'setError'>
): void {
  const parsed = parseLoadoutOfferResponse(result)
  if (!parsed.ok) {
    setters.setError(loadoutOfferErrorMessage(parsed))
    return
  }
  const previousSelections: AppliedStartingLoadoutSnapshot | null =
    parsed.previousSelections ?? null
  setters.setOffer(parsed.offer)
  setters.setState(
    resolveInitialEquipmentSelectionState(
      parsed.offer,
      previousSelections,
      readEquipmentSelectionDraft(characterId)
    )
  )
  setters.setInitialized(true)
}

function beginOfferFetch(characterId: string, setters: OfferSetters): () => void {
  let cancelled = false
  setters.setLoading(true)
  setters.setInitialized(false)
  setters.setError(null)
  void window.startingLoadout!
    .getOffer({ characterId })
    .then((result) => {
      if (!cancelled) {
        applyParsedOffer(characterId, result, setters)
      }
    })
    .catch(() => {
      if (!cancelled) {
        setters.setError('Equipment loading failed. Restart the app and try again.')
      }
    })
    .finally(() => {
      if (!cancelled) {
        setters.setLoading(false)
      }
    })
  return () => {
    cancelled = true
  }
}

function useFetchLoadoutOffer(characterId: string, setters: OfferSetters): void {
  useEffect(() => {
    if (!characterId) {
      rejectOfferLoad(setters, 'No character selected for equipment.')
      return
    }
    if (!window.startingLoadout?.getOffer) {
      rejectOfferLoad(setters, 'Equipment loading is unavailable. Restart the app.')
      return
    }
    return beginOfferFetch(characterId, setters)
  }, [characterId, setters])
}

function useLoadoutOffer(characterId: string) {
  const [offer, setOffer] = useState<StartingLoadoutOffer | null>(null)
  const [state, setState] = useState<EquipmentSelectionState | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const setters: OfferSetters = { setOffer, setState, setInitialized, setLoading, setError }

  useFetchLoadoutOffer(characterId, setters)

  useEffect(() => {
    if (!initialized || !state) {
      return
    }
    writeEquipmentSelectionDraft(characterId, state)
  }, [characterId, initialized, state])

  return { offer, state, setState, loading, error, setError }
}

export { useLoadoutOffer }
