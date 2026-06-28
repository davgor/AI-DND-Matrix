import { useState } from 'react'
import type { TurnResult } from '../../../main/turnIpc'
import { usePlayLog, type PlayLogController } from './usePlayLog'
import { useRollVisibility, type RollVisibilityController } from './useRollVisibility'
import { useSessionRecap, type SessionRecapController } from './useSessionRecap'
import { usePromotionPrompt, type PromotionPromptController } from './usePromotionPrompt'

export interface PlayViewController extends RollVisibilityController, PlayLogController {
  inputValue: string
  setInputValue: (value: string) => void
  submitting: boolean
  submitAction: () => Promise<void>
  lastCheck: TurnResult['check'] | null
  sheetOpen: boolean
  toggleSheet: () => void
  closeSheet: () => void
  recap: SessionRecapController
  promotion: PromotionPromptController
}

export function usePlayViewController(campaignId: string, characterId: string): PlayViewController {
  const [inputValue, setInputValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastCheck, setLastCheck] = useState<TurnResult['check'] | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const rollVisibility = useRollVisibility()
  const recap = useSessionRecap(campaignId)
  const playLog = usePlayLog(campaignId, (entries) => {
    if (entries.length > 0) {
      recap.show()
    }
  })
  const promotion = usePromotionPrompt(campaignId, () => void playLog.refreshLog())

  async function submitAction(): Promise<void> {
    if (!inputValue.trim() || submitting) {
      return
    }
    setSubmitting(true)
    try {
      const result = await window.turn.resolve({ campaignId, characterId, playerInput: inputValue })
      setInputValue('')
      setLastCheck(result.check ?? null)
      promotion.setProposed(result.proposedPromotion ?? null)
      await playLog.refreshLog()
    } finally {
      setSubmitting(false)
    }
  }

  return {
    inputValue,
    setInputValue,
    submitting,
    submitAction,
    ...rollVisibility,
    ...playLog,
    lastCheck,
    sheetOpen,
    toggleSheet: () => setSheetOpen((open) => !open),
    closeSheet: () => setSheetOpen(false),
    recap,
    promotion
  }
}
