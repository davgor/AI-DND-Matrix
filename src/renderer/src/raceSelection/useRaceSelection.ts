import { useCallback, useEffect, useState } from 'react'
import type { RaceRosterGroup } from '../../../main/raceIpc'
import { CUSTOM_RACE_KEY } from '../../../engine/raceSelection/roster'
import type { CampaignRace } from '../../../shared/raceSelection/types'
import {
  clearRaceSelectionDraft,
  readRaceSelectionDraft,
  writeRaceSelectionDraft
} from '../onboarding/onboardingSelectionDrafts'
import { buildRaceApplyInput } from './raceSelectionApply'
import {
  applyLorePreview,
  canConfirmRaceSelection,
  canGenerateLore,
  initialRaceSelectionState,
  resolveInitialRaceSelectionState,
  selectCustomRace,
  selectPresetRace,
  type RaceSelectionState
} from './raceSelectionLogic'

function useRaceRosterData(campaignId: string) {
  const [roster, setRoster] = useState<RaceRosterGroup[]>([])
  const [campaignRaces, setCampaignRaces] = useState<CampaignRace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!campaignId) {
      setError('No campaign selected for race selection.')
      setLoading(false)
      return
    }
    if (!window.race?.getRoster || !window.race?.getCampaignRaces) {
      setError('Race selection is unavailable. Restart the app.')
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    void Promise.all([window.race.getRoster(), window.race.getCampaignRaces(campaignId)])
      .then(([rosterResult, campaignRaceResult]) => {
        if (cancelled) {
          return
        }
        setRoster(rosterResult)
        setCampaignRaces(campaignRaceResult)
      })
      .catch(() => {
        if (!cancelled) {
          setError('Race loading failed. Restart the app and try again.')
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
  }, [campaignId])

  return { roster, campaignRaces, loading, error, setError }
}

function useRacePreview(
  campaignId: string,
  state: RaceSelectionState,
  setState: (next: RaceSelectionState) => void,
  setError: (value: string | null) => void
) {
  const [previewLoading, setPreviewLoading] = useState(false)

  const previewLore = useCallback(
    async (nextState: RaceSelectionState): Promise<void> => {
      if (!window.race?.previewLore || !canGenerateLore(nextState)) {
        return
      }
      setPreviewLoading(true)
      setError(null)
      try {
        const result =
          nextState.kind === 'preset' && nextState.raceKey
            ? await window.race.previewLore({
                campaignId,
                kind: 'preset',
                raceKey: nextState.raceKey
              })
            : await window.race.previewLore({
                campaignId,
                kind: 'custom',
                label: nextState.customLabel.trim() || 'Custom race',
                seedPrompt: nextState.customSeedPrompt.trim()
              })
        setState(applyLorePreview(nextState, result))
      } catch {
        setError('Could not generate race lore. Try again.')
      } finally {
        setPreviewLoading(false)
      }
    },
    [campaignId, setError, setState]
  )

  useEffect(() => {
    if (state.kind !== 'preset' || !state.raceKey || state.lore) {
      return
    }
    void previewLore(state)
  }, [previewLore, state])

  return { previewLoading, previewLore }
}

function useApplyRaceSelection(
  campaignId: string,
  characterId: string,
  state: RaceSelectionState,
  setError: (value: string | null) => void
) {
  const [submitting, setSubmitting] = useState(false)

  async function applySelection(onComplete: () => void): Promise<void> {
    const input = buildRaceApplyInput(campaignId, characterId, state)
    if (!input || !canConfirmRaceSelection(state) || !window.race?.apply) {
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const result = await window.race.apply(input)
      if (!result.ok) {
        setError('Could not save your race choice. Try again.')
        return
      }
      clearRaceSelectionDraft(characterId)
      onComplete()
    } catch {
      setError('Could not save your race choice. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return { submitting, applySelection }
}

function useRaceSelectionInitialization(
  characterId: string,
  savedRaceKey: string | null | undefined,
  campaignRaces: CampaignRace[],
  loading: boolean
) {
  const [initialized, setInitialized] = useState(false)
  const [state, setState] = useState<RaceSelectionState>(initialRaceSelectionState())

  useEffect(() => {
    if (loading) {
      setInitialized(false)
      return
    }
    setState(
      resolveInitialRaceSelectionState(
        savedRaceKey,
        campaignRaces,
        readRaceSelectionDraft(characterId)
      )
    )
    setInitialized(true)
  }, [characterId, campaignRaces, loading, savedRaceKey])

  useEffect(() => {
    if (!initialized) {
      return
    }
    writeRaceSelectionDraft(characterId, state)
  }, [characterId, initialized, state])

  return { initialized, state, setState }
}

export function useRaceSelection(
  campaignId: string,
  characterId: string,
  savedRaceKey: string | null | undefined
) {
  const loaded = useRaceRosterData(campaignId)
  const selection = useRaceSelectionInitialization(
    characterId,
    savedRaceKey,
    loaded.campaignRaces,
    loaded.loading
  )
  const preview = useRacePreview(campaignId, selection.state, selection.setState, loaded.setError)
  const submit = useApplyRaceSelection(campaignId, characterId, selection.state, loaded.setError)

  function pickPreset(raceKey: string): void {
    selection.setState((current) => selectPresetRace(current, raceKey))
  }

  function pickCustom(): void {
    selection.setState((current) => selectCustomRace(current))
  }

  return {
    roster: loaded.roster,
    campaignRaces: loaded.campaignRaces,
    state: selection.state,
    setState: selection.setState,
    loading: loaded.loading || !selection.initialized,
    previewLoading: preview.previewLoading,
    submitting: submit.submitting,
    error: loaded.error,
    pickPreset,
    pickCustom,
    previewLore: () => void preview.previewLore(selection.state),
    confirm: submit.applySelection
  }
}

export { CUSTOM_RACE_KEY }
