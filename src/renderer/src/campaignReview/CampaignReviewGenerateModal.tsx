import { GenerateModalOverlay } from './GenerateModalOverlay'
import { GenerateRegionDialog } from './GenerateRegionDialog'
import { useGenerateRegion } from './useGenerateRegion'

export interface CampaignReviewGenerateModalProps {
  campaignId: string
  onDetailChange: (detail: import('../../../main/campaignIpc').CampaignDetail) => void
  onClose: () => void
  initialNpcCount?: number
}

export function CampaignReviewGenerateModal(props: CampaignReviewGenerateModalProps): JSX.Element {
  const generate = useGenerateRegion(props)

  return (
    <GenerateModalOverlay generating={generate.generating} onClose={props.onClose}>
      <GenerateRegionDialog
        seedPrompt={generate.seedPrompt}
        npcCount={generate.npcCount}
        npcCountBounds={generate.npcCountBounds}
        generating={generate.generating}
        generateError={generate.generateError}
        onSeedChange={generate.setSeedPrompt}
        onNpcCountChange={generate.setNpcCount}
        onClose={props.onClose}
        onSubmit={() => void generate.submit()}
      />
    </GenerateModalOverlay>
  )
}
