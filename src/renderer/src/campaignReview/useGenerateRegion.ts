import { useState } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'
import {
  DEFAULT_ADDITIONAL_REGION_NPC_COUNT,
  MAX_ADDITIONAL_REGION_NPC_COUNT,
  MIN_ADDITIONAL_REGION_NPC_COUNT
} from '../../../shared/campaignCreate/types'
import { clampNpcsPerRegion } from '../../../shared/campaignCreate/validation'
import { useGenerateSeedSubmit } from './useGenerateSeedSubmit'

export interface UseGenerateRegionOptions {
  campaignId: string
  onDetailChange: (detail: CampaignDetail) => void
  onClose: () => void
  initialNpcCount?: number
}

export function useGenerateRegion(input: UseGenerateRegionOptions) {
  const [npcCount, setNpcCount] = useState(
    input.initialNpcCount ?? DEFAULT_ADDITIONAL_REGION_NPC_COUNT
  )
  const generate = useGenerateSeedSubmit({
    emptyMessage: 'Describe the region you want to add.',
    onDetailChange: input.onDetailChange,
    onClose: input.onClose,
    runGenerate: (trimmed) =>
      window.campaigns.generateRegion({
        campaignId: input.campaignId,
        seedPrompt: trimmed,
        npcCount
      })
  })

  return {
    ...generate,
    npcCount,
    setNpcCount: (value: number) => setNpcCount(clampNpcsPerRegion(value)),
    npcCountBounds: {
      min: MIN_ADDITIONAL_REGION_NPC_COUNT,
      max: MAX_ADDITIONAL_REGION_NPC_COUNT,
      default: DEFAULT_ADDITIONAL_REGION_NPC_COUNT
    }
  }
}
