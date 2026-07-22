import type { CampaignDetail } from '../../../main/campaignIpc'
import type { CampaignWithLastPlayed } from '../../../db/repositories/campaigns'
import { failureMessageForTest, runExportAction, runImportAction } from './campaignPortabilityActions'

export interface SidebarPortabilityApi {
  portabilityError: string | null
  clearPortabilityError: () => void
  exportCampaign: (campaignId: string) => Promise<void>
  importCampaign: () => Promise<void>
  duplicateCampaign: (campaignId: string) => Promise<void>
}

export function createSidebarPortabilityApi(input: {
  setPortabilityError: (message: string | null) => void
  refreshCampaigns: () => Promise<void>
}): SidebarPortabilityApi {
  return {
    portabilityError: null,
    clearPortabilityError: () => input.setPortabilityError(null),
    exportCampaign: async (campaignId) => {
      input.setPortabilityError(null)
      const result = await runExportAction(
        (id) => window.campaigns.export(id),
        input.refreshCampaigns,
        campaignId
      )
      input.setPortabilityError(result.error)
    },
    importCampaign: async () => {
      input.setPortabilityError(null)
      const result = await runImportAction(() => window.campaigns.import(), input.refreshCampaigns)
      input.setPortabilityError(result.error)
    },
    duplicateCampaign: async (campaignId) => {
      input.setPortabilityError(null)
      const result = await window.campaigns.duplicate(campaignId)
      if (!result.ok) {
        input.setPortabilityError(failureMessageForTest(result))
        return
      }
      await input.refreshCampaigns()
    }
  }
}

export type { CampaignDetail, CampaignWithLastPlayed }
