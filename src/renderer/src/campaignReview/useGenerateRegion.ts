import { useState } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'

export function useGenerateRegion(input: {
  campaignId: string
  onDetailChange: (detail: CampaignDetail) => void
  onClose: () => void
}) {
  const [seedPrompt, setSeedPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  async function submit(): Promise<void> {
    const trimmed = seedPrompt.trim()
    if (!trimmed) {
      setGenerateError('Describe the region you want to add.')
      return
    }
    setGenerating(true)
    setGenerateError(null)
    try {
      const result = await window.campaigns.generateRegion({
        campaignId: input.campaignId,
        seedPrompt: trimmed
      })
      if (result.ok) {
        input.onDetailChange(result.detail)
        input.onClose()
      } else {
        setGenerateError(result.message)
      }
    } finally {
      setGenerating(false)
    }
  }

  return { seedPrompt, setSeedPrompt, generating, generateError, submit }
}
