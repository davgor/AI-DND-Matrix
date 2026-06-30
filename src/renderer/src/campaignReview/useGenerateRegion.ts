import { useState } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'
import {
  DEFAULT_ADDITIONAL_REGION_NPC_COUNT,
  MAX_ADDITIONAL_REGION_NPC_COUNT,
  MIN_ADDITIONAL_REGION_NPC_COUNT
} from '../../../shared/campaignCreate/types'
import { clampNpcsPerRegion } from '../../../shared/campaignCreate/validation'

export interface UseGenerateRegionOptions {
  campaignId: string
  onDetailChange: (detail: CampaignDetail) => void
  onClose: () => void
  initialNpcCount?: number
}

export function useGenerateRegion(input: UseGenerateRegionOptions) {
  const [seedPrompt, setSeedPrompt] = useState('')
  const [npcCount, setNpcCount] = useState(
    input.initialNpcCount ?? DEFAULT_ADDITIONAL_REGION_NPC_COUNT
  )
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  function updateNpcCount(value: number): void {
    setNpcCount(clampNpcsPerRegion(value))
  }

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
        seedPrompt: trimmed,
        npcCount
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

  return {
    seedPrompt,
    setSeedPrompt,
    npcCount,
    setNpcCount: updateNpcCount,
    npcCountBounds: {
      min: MIN_ADDITIONAL_REGION_NPC_COUNT,
      max: MAX_ADDITIONAL_REGION_NPC_COUNT,
      default: DEFAULT_ADDITIONAL_REGION_NPC_COUNT
    },
    generating,
    generateError,
    submit
  }
}
