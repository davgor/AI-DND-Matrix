import { useCallback, useEffect, useState } from 'react'
import type { RaceRosterGroup } from '../../../main/raceIpc'
import { CUSTOM_RACE_KEY } from '../../../engine/raceSelection/roster'
import type { CampaignRace } from '../../../shared/raceSelection/types'
import { buildRaceApplyInput } from './raceSelectionApply'
import {
  applyLorePreview,
  canConfirmRaceSelection,
  canGenerateLore,
  initialRaceSelectionState,
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
      onComplete()
    } catch {
      setError('Could not save your race choice. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return { submitting, applySelection }
}

export function useRaceSelection(campaignId: string, characterId: string) {
  const loaded = useRaceRosterData(campaignId)
  const [state, setState] = useState<RaceSelectionState>(initialRaceSelectionState())
  const preview = useRacePreview(campaignId, state, setState, loaded.setError)
  const submit = useApplyRaceSelection(campaignId, characterId, state, loaded.setError)

  function pickPreset(raceKey: string): void {
    setState(selectPresetRace(state, raceKey))
  }

  function pickCustom(): void {
    setState(selectCustomRace(state))
  }

  return {
    roster: loaded.roster,
    campaignRaces: loaded.campaignRaces,
    state,
    setState,
    loading: loaded.loading,
    previewLoading: preview.previewLoading,
    submitting: submit.submitting,
    error: loaded.error,
    pickPreset,
    pickCustom,
    previewLore: () => void preview.previewLore(state),
    confirm: submit.applySelection
  }
}

export { CUSTOM_RACE_KEY }
