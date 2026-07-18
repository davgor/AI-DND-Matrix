import { GenerateModalOverlay } from './GenerateModalOverlay'
import { GenerateNpcDialog } from './GenerateNpcDialog'
import { useGenerateNpc } from './useGenerateNpc'

export function CampaignReviewGenerateNpcModal(props: {
  campaignId: string
  regionId: string
  regionName: string
  onDetailChange: (detail: import('../../../main/campaignIpc').CampaignDetail) => void
  onClose: () => void
}): JSX.Element {
  const generate = useGenerateNpc(props)

  return (
    <GenerateModalOverlay generating={generate.generating} onClose={props.onClose}>
      <GenerateNpcDialog
        regionName={props.regionName}
        seedPrompt={generate.seedPrompt}
        generating={generate.generating}
        generateError={generate.generateError}
        onSeedChange={generate.setSeedPrompt}
        onClose={props.onClose}
        onSubmit={() => void generate.submit()}
      />
    </GenerateModalOverlay>
  )
}
