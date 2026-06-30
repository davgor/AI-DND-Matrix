import type { CampaignDetail } from '../../../main/campaignIpc'
import { CampaignReviewGenerateModal } from './CampaignReviewGenerateModal'
import { CampaignReviewGenerateNpcModal } from './CampaignReviewGenerateNpcModal'

export function CampaignReviewModals(props: {
  campaignId: string
  generateOpen: boolean
  generateNpcRegion: { region: { id: string; name: string } } | undefined
  onDetailChange: (detail: CampaignDetail) => void
  onCloseGenerate: () => void
  onCloseGenerateNpc: () => void
}): JSX.Element | null {
  if (props.generateOpen) {
    return (
      <CampaignReviewGenerateModal
        campaignId={props.campaignId}
        onDetailChange={props.onDetailChange}
        onClose={props.onCloseGenerate}
      />
    )
  }
  if (props.generateNpcRegion) {
    return (
      <CampaignReviewGenerateNpcModal
        campaignId={props.campaignId}
        regionId={props.generateNpcRegion.region.id}
        regionName={props.generateNpcRegion.region.name}
        onDetailChange={props.onDetailChange}
        onClose={props.onCloseGenerateNpc}
      />
    )
  }
  return null
}
