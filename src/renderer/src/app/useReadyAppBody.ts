import { useState } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'
import type { OnboardingStage } from '../../../shared/guidedCreation/stageRouting'
import { useHubCampaignState } from './useHubCampaignState'
import { usePlayEntryState } from './usePlayEntryState'

export function useReadyAppBodyState(input: {
  detail: CampaignDetail | null
  stage: OnboardingStage
  setDetail: (detail: CampaignDetail | null) => void
  setStage: (stage: OnboardingStage) => void
}) {
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null)
  const hub = useHubCampaignState({ ...input, setActiveCharacterId })
  const play = usePlayEntryState({ ...input, activeCharacterId, setActiveCharacterId })

  async function refreshDetail(): Promise<void> {
    if (!input.detail?.campaign) {
      return
    }
    const next = await window.campaigns.select(input.detail.campaign.id)
    input.setDetail(next)
    if (input.stage === 'campaignHub') {
      await hub.refreshHubSnapshot()
    }
  }

  return {
    ...hub,
    ...play,
    refreshDetail,
    onCampaignSelected: hub.onCampaignSelected
  }
}
