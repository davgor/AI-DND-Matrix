import type { CampaignDetail } from '../../../main/campaignIpc'
import type { EditNpcTraitsInput } from '../../../main/campaignEditIpc'

export function createCampaignReviewSavers(
  campaignId: string,
  onDetailChange: (detail: CampaignDetail) => void
) {
  return {
    saveRegionDescription: async (regionId: string, description: string): Promise<void> => {
      const next = await window.campaigns.editRegionDescription({ campaignId, regionId, description })
      onDetailChange(next)
    },
    saveNpcTraits: async (input: EditNpcTraitsInput): Promise<void> => {
      const next = await window.campaigns.editNpcTraits(input)
      onDetailChange(next)
    },
    saveWorldSummary: async (worldSummary: string): Promise<void> => {
      const next = await window.campaigns.editWorldSummary({ campaignId, worldSummary })
      onDetailChange(next)
    },
    saveWorldHistory: async (worldHistory: string): Promise<void> => {
      const next = await window.campaigns.editWorldHistory({ campaignId, worldHistory })
      onDetailChange(next)
    }
  }
}
