import { useState } from 'react'
import type { TurnResult } from '../../../main/turnIpc'
import type { ExpositionStatus } from '../../../shared/inCampaignLayout/types'
import type { PlayLogController } from './usePlayLog'
import type { PromotionPromptController } from './usePromotionPrompt'
import { failedExposition, idleExposition, loadingExposition } from './submitPlayerTurn'
import { runTurnSubmission } from './runTurnSubmission'

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

  async function submitAction(): Promise<void> {
    if (!inputValue.trim() || submitting) {
      return
    }
    setSubmitting(true)
    setExpositionStatus(loadingExposition())
    try {
      const outcome = await runTurnSubmission({ ...input, playerInput: inputValue, characterRefreshToken })
      setInputValue('')
      setLastCheck(outcome.lastCheck)
      setCharacterRefreshToken(outcome.characterRefreshToken)
      setExpositionStatus(outcome.expositionStatus)
    } catch {
      setExpositionStatus(failedExposition('Could not update the scene. Check your connection and try again.'))
    } finally {
      setSubmitting(false)
    }
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
    characterRefreshToken
  }
}
