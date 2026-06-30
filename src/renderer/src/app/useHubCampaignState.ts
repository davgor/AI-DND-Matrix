import { useState } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'
import type { OnboardingStage } from '../../../shared/guidedCreation/stageRouting'
import { stageAfterCampaignSelect } from '../../../shared/guidedCreation/stageRouting'
import { useHubSnapshot } from './useHubSnapshot'

export function useHubCampaignState(input: {
  detail: CampaignDetail | null
  stage: OnboardingStage
  setDetail: (detail: CampaignDetail | null) => void
  setStage: (stage: OnboardingStage) => void
  setActiveCharacterId: (id: string | null) => void
}) {
  const [hubGenerateOpen, setHubGenerateOpen] = useState(false)
  const snapshot = useHubSnapshot(
    input.stage,
    input.detail?.campaign?.id,
    input.detail?.campaign?.createdAt ?? ''
  )

  async function refreshHubSnapshot(): Promise<void> {
    if (!input.detail?.campaign) {
      return
    }
    await snapshot.refreshHubSnapshot(input.detail.campaign.id)
  }

  function onCampaignSelected(next: CampaignDetail): void {
    input.setDetail(next)
    input.setStage(stageAfterCampaignSelect(next.characters))
    input.setActiveCharacterId(null)
    if (stageAfterCampaignSelect(next.characters) === 'campaignHub' && next.campaign) {
      void window.campaigns.getHubSnapshot(next.campaign.id).then((hub) => {
        snapshot.primeHubSnapshot(hub, next.campaign?.createdAt ?? '')
      })
    }
  }

  async function handleExitToCampaignHub(): Promise<void> {
    if (input.detail?.campaign) {
      const next = await window.campaigns.select(input.detail.campaign.id)
      input.setDetail(next)
      const hub = await window.campaigns.getHubSnapshot(input.detail.campaign.id)
      snapshot.primeHubSnapshot(hub, next.campaign?.createdAt ?? '')
    }
    input.setActiveCharacterId(null)
    input.setStage('campaignHub')
  }

  return {
    hubSnapshot: snapshot.hubSnapshot,
    hubLastPlayed: snapshot.hubLastPlayed,
    hubGenerateOpen,
    setHubGenerateOpen,
    refreshHubSnapshot,
    onCampaignSelected,
    handleExitToCampaignHub
  }
}
