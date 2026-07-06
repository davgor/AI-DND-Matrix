import { useCallback, useEffect, useState } from 'react'
import type { BackgroundRosterEntry } from '../../../shared/characterBackground/types'
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

function useBackgroundGenerateModal(
  campaignId: string,
  characterId: string,
  backgroundKey: string | null,
  setState: (updater: (current: BackgroundSelectionState) => BackgroundSelectionState) => void
) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const generateStory = useCallback(
    async (playerPrompt: string): Promise<void> => {
      if (!backgroundKey || !window.background?.generateStory) {
        return
      }
      setModalLoading(true)
      setModalError(null)
      try {
        const story = await window.background.generateStory({
          campaignId,
          characterId,
          backgroundKey,
          ...(playerPrompt ? { playerPrompt } : {})
        })
        setState((current) => ({ ...current, story }))
        setModalOpen(false)
      } catch {
        setModalError('Could not generate a background story. Try again.')
      } finally {
        setModalLoading(false)
      }
    },
    [backgroundKey, campaignId, characterId, setState]
  )

  return {
    modalOpen,
    modalLoading,
    modalError,
    openGenerate: () => {
      setModalError(null)
      setModalOpen(true)
    },
    closeGenerate: () => {
      if (!modalLoading) {
        setModalOpen(false)
        setModalError(null)
      }
    },
    generateStory
  }
}

export function useBackgroundSelection(
  campaignId: string,
  characterId: string,
  savedBackgroundKey: string | null | undefined,
  savedBackgroundStory: string | null | undefined
) {
  const loaded = useBackgroundRosterData()
  const [initialized, setInitialized] = useState(false)
  const [state, setState] = useState<BackgroundSelectionState>(initialBackgroundSelectionState())
  const apply = useBackgroundApply(campaignId, characterId, state, loaded.setError)
  const modal = useBackgroundGenerateModal(campaignId, characterId, state.backgroundKey, setState)

  useEffect(() => {
    if (loaded.loading) {
      setInitialized(false)
      return
    }
    setState(
      resolveInitialBackgroundSelectionState(
        savedBackgroundKey,
        savedBackgroundStory,
        readBackgroundSelectionDraft(characterId)
      )
    )
    setInitialized(true)
  }, [characterId, loaded.loading, savedBackgroundKey, savedBackgroundStory])

  useEffect(() => {
    if (!initialized) {
      return
    }
    writeBackgroundSelectionDraft(characterId, state)
  }, [characterId, initialized, state])

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
