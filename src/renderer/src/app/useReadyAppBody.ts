import { useState } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'
import type { OnboardingStage } from '../../../shared/guidedCreation/stageRouting'
import { useHubCampaignState } from './useHubCampaignState'
import { usePlayEntryState } from './usePlayEntryState'

type PlayEntryBase = {
  detail: CampaignDetail | null
  stage: OnboardingStage
  setStage: (stage: OnboardingStage) => void
  activeCharacterId: string | null
  setActiveCharacterId: (id: string | null) => void
}

/** Compose play-entry hook input with a required campaign detail refresh. */
export function attachPlayEntryRefreshDetail(
  base: PlayEntryBase,
  refreshDetail: () => Promise<void>
): PlayEntryBase & { refreshDetail: () => Promise<void> } {
  return { ...base, refreshDetail }
}

export function useReadyAppBodyState(input: {
  detail: CampaignDetail | null
  stage: OnboardingStage
  setDetail: (detail: CampaignDetail | null) => void
  setStage: (stage: OnboardingStage) => void
}) {
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null)
  const hub = useHubCampaignState({ ...input, setActiveCharacterId })

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

  const play = usePlayEntryState(
    attachPlayEntryRefreshDetail(
      { ...input, activeCharacterId, setActiveCharacterId },
      refreshDetail
    )
  )

  return {
    ...hub,
    ...play,
    refreshDetail,
    onCampaignSelected: hub.onCampaignSelected
  }
}
