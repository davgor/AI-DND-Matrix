import { useState } from 'react'
import type { CampaignWithLastPlayed } from '../../../db/repositories/campaigns'

export interface CampaignDeleteFlow {
  target: CampaignWithLastPlayed | null
  deleting: boolean
  error: string | null
  open: (campaign: CampaignWithLastPlayed) => void
  close: () => void
  confirm: () => Promise<boolean>
}

export function useCampaignDeleteFlow(onDeleted: (campaignId: string) => Promise<void>): CampaignDeleteFlow {
  const [target, setTarget] = useState<CampaignWithLastPlayed | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function open(campaign: CampaignWithLastPlayed): void {
    setTarget(campaign)
    setError(null)
  }

  function close(): void {
    if (deleting) {
      return
    }
    setTarget(null)
    setError(null)
  }

  async function confirm(): Promise<boolean> {
    if (!target || deleting) {
      return false
    }
    setDeleting(true)
    setError(null)
    try {
      const result = await window.campaigns.delete(target.id)
      if (!result.ok) {
        setError(result.message)
        return false
      }
      await onDeleted(target.id)
      setTarget(null)
      return true
    } finally {
      setDeleting(false)
    }
  }

  return { target, deleting, error, open, close, confirm }
}
