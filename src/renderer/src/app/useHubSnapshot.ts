import { useEffect, useState } from 'react'
import type { PlayAwareHubSnapshot } from '../../../shared/campaignHub/types'
import type { OnboardingStage } from '../../../shared/guidedCreation/stageRouting'

export function useHubSnapshot(stage: OnboardingStage, campaignId: string | undefined, createdAt: string) {
  const [hubSnapshot, setHubSnapshot] = useState<PlayAwareHubSnapshot | null>(null)
  const [hubLastPlayed, setHubLastPlayed] = useState('')

  useEffect(() => {
    if (stage !== 'campaignHub' || !campaignId || hubSnapshot) {
      return
    }
    void window.campaigns.getHubSnapshot(campaignId).then((snapshot) => {
      setHubSnapshot(snapshot)
      setHubLastPlayed(createdAt)
    })
  }, [stage, campaignId, hubSnapshot, createdAt])

  async function refreshHubSnapshot(targetCampaignId: string): Promise<void> {
    const snapshot = await window.campaigns.getHubSnapshot(targetCampaignId)
    setHubSnapshot(snapshot)
    setHubLastPlayed(createdAt)
  }

  function primeHubSnapshot(snapshot: PlayAwareHubSnapshot, lastPlayed: string): void {
    setHubSnapshot(snapshot)
    setHubLastPlayed(lastPlayed)
  }

  return { hubSnapshot, hubLastPlayed, refreshHubSnapshot, primeHubSnapshot }
}
