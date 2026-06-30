import type { CampaignDetail } from '../../../main/campaignIpc'
import { GenerateNpcDialog } from './GenerateNpcDialog'
import { useGenerateNpc } from './useGenerateNpc'

export function CampaignReviewGenerateNpcModal(props: {
  campaignId: string
  regionId: string
  regionName: string
  onDetailChange: (detail: CampaignDetail) => void
  onClose: () => void
}): JSX.Element {
  const generate = useGenerateNpc(props)

  return (
    <div
      className="campaign-review-overlay"
      role="presentation"
      onClick={() => {
        if (!generate.generating) {
          props.onClose()
        }
      }}
    >
      <GenerateNpcDialog
        regionName={props.regionName}
        seedPrompt={generate.seedPrompt}
        generating={generate.generating}
        generateError={generate.generateError}
        onSeedChange={generate.setSeedPrompt}
        onClose={props.onClose}
        onSubmit={() => void generate.submit()}
      />
    </div>
  )
}
