import { useEffect, useState } from 'react'
import type { CampaignRace } from '../../../shared/raceSelection/types'

/** Loads campaign race catalog; `reloadKey` refreshes after NPC/race mutations. */
export function useCampaignRaces(campaignId: string, reloadKey?: unknown): CampaignRace[] {
  const [campaignRaces, setCampaignRaces] = useState<CampaignRace[]>([])

  useEffect(() => {
    if (!campaignId) {
      setCampaignRaces([])
      return undefined
    }
    let cancelled = false
    void window.race.getCampaignRaces(campaignId).then((races) => {
      if (!cancelled) {
        setCampaignRaces(races)
      }
    })
    return () => {
      cancelled = true
    }
  }, [campaignId, reloadKey])

  return campaignRaces
}
