import { useGenerateSeedSubmit } from './useGenerateSeedSubmit'

export function useGenerateNpc(input: {
  campaignId: string
  regionId: string
  onDetailChange: (detail: import('../../../main/campaignIpc').CampaignDetail) => void
  onClose: () => void
}) {
  return useGenerateSeedSubmit({
    emptyMessage: 'Describe the NPC you want to add.',
    onDetailChange: input.onDetailChange,
    onClose: input.onClose,
    runGenerate: (trimmed) =>
      window.campaigns.generateNpc({
        campaignId: input.campaignId,
        regionId: input.regionId,
        seedPrompt: trimmed
      })
  })
}
