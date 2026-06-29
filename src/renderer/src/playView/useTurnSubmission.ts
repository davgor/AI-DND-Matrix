import { useEffect, useState } from 'react'
import type { TurnResult } from '../../../main/turnIpc'
import type { ExpositionStatus } from '../../../shared/inCampaignLayout/types'
import type { Alignment, PendingAlignmentShift } from '../../../shared/alignment/types'
import type { PlayLogController } from './usePlayLog'
import type { PromotionPromptController } from './usePromotionPrompt'
import { idleExposition, loadingExposition } from './submitPlayerTurn'
import { executeTurnSubmission, refreshPlayerAlignmentState } from './turnSubmissionActions'

export function useTurnSubmission(input: {
  campaignId: string
  characterId: string
  playLog: PlayLogController
  promotion: PromotionPromptController
}) {
  const [inputValue, setInputValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastCheck, setLastCheck] = useState<TurnResult['check'] | null>(null)
  const [characterRefreshToken, setCharacterRefreshToken] = useState(0)
  const [expositionStatus, setExpositionStatus] = useState<ExpositionStatus>(idleExposition())
  const [pendingAlignmentShift, setPendingAlignmentShift] = useState<PendingAlignmentShift | null>(null)
  const [playerAlignment, setPlayerAlignment] = useState<Alignment | null>(null)

  useEffect(() => {
    void refreshPlayerAlignmentState(input.campaignId, input.characterId).then((state) => {
      setPendingAlignmentShift(state.pending)
      setPlayerAlignment(state.alignment)
    })
  }, [input.campaignId, input.characterId, characterRefreshToken])

  async function submitAction(): Promise<void> {
    if (!inputValue.trim() || submitting) return
    setSubmitting(true)
    setExpositionStatus(loadingExposition())
    const outcome = await executeTurnSubmission({ ...input, playerInput: inputValue, characterRefreshToken })
    setInputValue('')
    setLastCheck(outcome.lastCheck)
    setCharacterRefreshToken(outcome.characterRefreshToken)
    setExpositionStatus(outcome.expositionStatus)
    setPendingAlignmentShift(outcome.pendingAlignmentShift)
    if (outcome.playerAlignment) setPlayerAlignment(outcome.playerAlignment)
    setSubmitting(false)
  }

  return {
    inputValue,
    setInputValue,
    submitting,
    submitAction,
    lastCheck,
    expositionStatus,
    retryExposition: () => {
      setExpositionStatus(idleExposition())
      void input.playLog.refreshLog()
    },
    characterRefreshToken,
    pendingAlignmentShift,
    playerAlignment
  }
}
