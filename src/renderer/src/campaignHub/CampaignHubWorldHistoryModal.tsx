import { CampaignReviewWorldHistoryModal } from '../campaignReview/CampaignReviewWorldHistoryModal'

export function CampaignHubWorldHistoryModal(props: {
  worldHistory: string
  onClose: () => void
}): JSX.Element {
  return (
    <CampaignReviewWorldHistoryModal
      initialValue={props.worldHistory}
      onSave={async () => {}}
      onClose={props.onClose}
      readOnly
    />
  )
}
