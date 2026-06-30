import type { CampaignDetail } from '../../../main/campaignIpc'
import { CampaignReviewGenerateModal } from '../campaignReview/CampaignReviewGenerateModal'

export interface CampaignHubGenerateModalProps {
  open: boolean
  campaignId: string
  onClose: () => void
  onSuccess: (detail: CampaignDetail) => void
}

export function CampaignHubGenerateModal(props: CampaignHubGenerateModalProps): JSX.Element | null {
  if (!props.open) {
    return null
  }
  return (
    <CampaignReviewGenerateModal
      campaignId={props.campaignId}
      onDetailChange={props.onSuccess}
      onClose={props.onClose}
    />
  )
}
