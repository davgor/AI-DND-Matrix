import { useCallback, useEffect, useState } from 'react'
import type { BackgroundRosterEntry } from '../../../shared/characterBackground/types'
import { isCustomBackgroundKey } from '../../../shared/characterBackground/types'
import {
  clearBackgroundSelectionDraft,
  readBackgroundSelectionDraft,
  writeBackgroundSelectionDraft
} from '../onboarding/onboardingSelectionDrafts'
import { buildBackgroundApplyInput } from './backgroundSelectionApply'
import {
  canConfirmBackgroundSelection,
  initialBackgroundSelectionState,
  resolveInitialBackgroundSelectionState,
  type BackgroundSelectionState
} from './backgroundSelectionLogic'

function useBackgroundRosterData() {
  const [roster, setRoster] = useState<BackgroundRosterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!window.background?.getRoster) {
      setError('Background selection is unavailable. Restart the app.')
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    void window.background
      .getRoster()
      .then((entries) => {
        if (!cancelled) {
          setRoster(entries)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Background loading failed. Restart the app and try again.')
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
  }, [])

  return { roster, loading, error, setError }
}

function useBackgroundApply(
  campaignId: string,
  characterId: string,
  state: BackgroundSelectionState,
  setError: (value: string | null) => void
) {
  const [submitting, setSubmitting] = useState(false)

  const confirm = useCallback(
    async (onComplete: () => void): Promise<void> => {
      const input = buildBackgroundApplyInput(campaignId, characterId, state)
      if (!input || !canConfirmBackgroundSelection(state) || !window.background?.apply) {
        return
      }
      setSubmitting(true)
      setError(null)
      try {
        const result = await window.background.apply(input)
        if (!result.ok) {
          setError('Could not save your background. Try again.')
          return
        }
        clearBackgroundSelectionDraft(characterId)
        onComplete()
      } catch {
        setError('Could not save your background. Try again.')
      } finally {
        setSubmitting(false)
      }
    },
    [campaignId, characterId, setError, state]
  )

  return { submitting, confirm }
}

async function requestBackgroundStory(input: {
  campaignId: string
  characterId: string
  state: BackgroundSelectionState
  playerPrompt: string
}): Promise<string> {
  if (!input.state.backgroundKey || !window.background?.generateStory) {
    throw new Error('Background story generation unavailable')
  }
  return window.background.generateStory({
    campaignId: input.campaignId,
    characterId: input.characterId,
    backgroundKey: input.state.backgroundKey,
    ...(isCustomBackgroundKey(input.state.backgroundKey)
      ? { backgroundCustomLabel: input.state.customLabel.trim() }
      : {}),
    ...(input.playerPrompt ? { playerPrompt: input.playerPrompt } : {})
  })
}

function useBackgroundGenerateModal(
  campaignId: string,
  characterId: string,
  state: BackgroundSelectionState,
  setState: (updater: (current: BackgroundSelectionState) => BackgroundSelectionState) => void
) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const generateStory = useCallback(
    async (playerPrompt: string): Promise<void> => {
      if (!state.backgroundKey) {
        return
      }
      if (isCustomBackgroundKey(state.backgroundKey) && !state.customLabel.trim()) {
        return
      }
      setModalLoading(true)
      setModalError(null)
      try {
        const story = await requestBackgroundStory({ campaignId, characterId, state, playerPrompt })
        setState((current) => ({ ...current, story }))
        setModalOpen(false)
      } catch {
        setModalError('Could not generate a background story. Try again.')
      } finally {
        setModalLoading(false)
      }
    },
    [campaignId, characterId, setState, state]
  )

  const openGenerate = useCallback(() => {
    setModalError(null)
    setModalOpen(true)
  }, [])

  const closeGenerate = useCallback(() => {
    if (!modalLoading) {
      setModalOpen(false)
      setModalError(null)
    }
  }, [modalLoading])

  return { modalOpen, modalLoading, modalError, openGenerate, closeGenerate, generateStory }
}

interface UseBackgroundSelectionInput {
  campaignId: string
  characterId: string
  savedBackgroundKey?: string | null
  savedBackgroundStory?: string | null
  savedCustomLabel?: string | null
}

export function useBackgroundSelection(input: UseBackgroundSelectionInput) {
  const loaded = useBackgroundRosterData()
  const [initialized, setInitialized] = useState(false)
  const [state, setState] = useState<BackgroundSelectionState>(initialBackgroundSelectionState())
  const apply = useBackgroundApply(input.campaignId, input.characterId, state, loaded.setError)
  const modal = useBackgroundGenerateModal(input.campaignId, input.characterId, state, setState)

  useEffect(() => {
    if (loaded.loading) {
      setInitialized(false)
      return
    }
    setState(
      resolveInitialBackgroundSelectionState(
        input.savedBackgroundKey,
        input.savedBackgroundStory,
        readBackgroundSelectionDraft(input.characterId),
        input.savedCustomLabel
      )
    )
    setInitialized(true)
  }, [
    input.characterId,
    input.savedBackgroundKey,
    input.savedBackgroundStory,
    input.savedCustomLabel,
    loaded.loading
  ])

  useEffect(() => {
    if (!initialized) {
      return
    }
    writeBackgroundSelectionDraft(input.characterId, state)
  }, [input.characterId, initialized, state])

  return {
    roster: loaded.roster,
    loading: loaded.loading || !initialized,
    error: loaded.error,
    state,
    setState,
    submitting: apply.submitting,
    ...modal,
    confirm: apply.confirm
  }
}
