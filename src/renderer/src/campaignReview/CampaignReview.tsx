import { useState } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'
import type { EditNpcTraitsInput } from '../../../main/campaignEditIpc'
import {
  buildRegionBlocks,
  CampaignReviewHeader,
  CampaignReviewRegions
} from './CampaignReviewLayout'
import { CampaignReviewModals } from './CampaignReviewModals'
import { CampaignReviewFooter, CampaignReviewStory } from './CampaignReviewSections'
import './campaignReview.css'

export interface CampaignReviewProps {
  detail: CampaignDetail
  onDetailChange: (detail: CampaignDetail) => void
  onContinue: () => void
}

export function CampaignReview(props: CampaignReviewProps): JSX.Element {
  const { detail } = props
  const campaignId = detail.campaign?.id ?? ''
  const regionBlocks = buildRegionBlocks(detail)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generateNpcRegionId, setGenerateNpcRegionId] = useState<string | null>(null)
  const generateNpcRegion = regionBlocks.find((block) => block.region.id === generateNpcRegionId)

  async function saveRegionDescription(regionId: string, description: string): Promise<void> {
    const next = await window.campaigns.editRegionDescription({ campaignId, regionId, description })
    props.onDetailChange(next)
  }

  async function saveNpcTraits(input: EditNpcTraitsInput): Promise<void> {
    const next = await window.campaigns.editNpcTraits(input)
    props.onDetailChange(next)
  }

  return (
    <div className="campaign-review">
      <CampaignReviewHeader campaignName={detail.campaign?.name} />
      <CampaignReviewStory storyThreads={detail.storyThreads} />
      <CampaignReviewRegions
        campaignId={campaignId}
        regionBlocks={regionBlocks}
        onSaveRegionDescription={saveRegionDescription}
        onSaveNpcTraits={saveNpcTraits}
        onGenerateNpc={setGenerateNpcRegionId}
      />
      <CampaignReviewFooter
        detail={detail}
        onGenerate={() => setGenerateOpen(true)}
        onContinue={props.onContinue}
      />
      <CampaignReviewModals
        campaignId={campaignId}
        generateOpen={generateOpen}
        generateNpcRegion={generateNpcRegion}
        onDetailChange={props.onDetailChange}
        onCloseGenerate={() => setGenerateOpen(false)}
        onCloseGenerateNpc={() => setGenerateNpcRegionId(null)}
      />
    </div>
  )
}
