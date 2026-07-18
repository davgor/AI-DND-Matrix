import { useState } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'

type GenerateResult =
  | { ok: true; detail: CampaignDetail }
  | { ok: false; message: string }

export function useGenerateSeedSubmit(input: {
  emptyMessage: string
  onDetailChange: (detail: CampaignDetail) => void
  onClose: () => void
  runGenerate: (trimmedSeed: string) => Promise<GenerateResult>
}) {
  const [seedPrompt, setSeedPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  async function submit(): Promise<void> {
    const trimmed = seedPrompt.trim()
    if (!trimmed) {
      setGenerateError(input.emptyMessage)
      return
    }
    setGenerating(true)
    setGenerateError(null)
    try {
      const result = await input.runGenerate(trimmed)
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
