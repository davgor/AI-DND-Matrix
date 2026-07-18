import type { CampaignDetail } from '../../../main/campaignIpc'

export function createCampaignReviewSavers(
  campaignId: string,
  onDetailChange: (detail: CampaignDetail) => void
) {
  return {
    deleteRegion: async (regionId: string): Promise<void> => {
      const next = await window.campaigns.deleteRegion({ campaignId, regionId })
      onDetailChange(next)
    },
    deleteNpc: async (npcId: string): Promise<void> => {
      const next = await window.campaigns.deleteNpc({ campaignId, npcId })
      onDetailChange(next)
    },
    saveWorldSummary: async (worldSummary: string): Promise<void> => {
      const next = await window.campaigns.editWorldSummary({ campaignId, worldSummary })
      onDetailChange(next)
    },
    saveWorldHistory: async (worldHistory: string): Promise<void> => {
      const next = await window.campaigns.editWorldHistory({ campaignId, worldHistory })
      onDetailChange(next)
    },
    savePantheonSummary: async (pantheonSummary: string): Promise<void> => {
      const next = await window.campaigns.editPantheonSummary({ campaignId, pantheonSummary })
      onDetailChange(next)
    }
  }
}
