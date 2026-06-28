import { useState } from 'react'
import type { ProposedPromotion } from '../../../main/turnIpc'

export interface PromotionPromptController {
  proposed: ProposedPromotion | null
  confirming: boolean
  setProposed: (proposed: ProposedPromotion | null) => void
  confirm: () => Promise<void>
  decline: () => void
}

export function usePromotionPrompt(campaignId: string, onConfirmed: () => void): PromotionPromptController {
  const [proposed, setProposed] = useState<ProposedPromotion | null>(null)
  const [confirming, setConfirming] = useState(false)

  async function confirm(): Promise<void> {
    if (!proposed) {
      return
    }
    setConfirming(true)
    try {
      await window.campaigns.confirmPromotion({ campaignId, npcId: proposed.npcId })
      setProposed(null)
      onConfirmed()
    } finally {
      setConfirming(false)
    }
  }

  function decline(): void {
    setProposed(null)
  }

  return { proposed, confirming, setProposed, confirm, decline }
}
