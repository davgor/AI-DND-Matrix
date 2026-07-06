import { useState } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'
import {
  buildRegionBlocks,
  CampaignReviewHeader,
  CampaignReviewRegions
} from './CampaignReviewLayout'
import { CampaignReviewModals } from './CampaignReviewModals'
import { CampaignReviewFooter, CampaignReviewStory } from './CampaignReviewSections'
import { CampaignReviewWorldSection } from './CampaignReviewWorldSection'
import { createCampaignReviewSavers } from './campaignReviewSavers'
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
  const savers = createCampaignReviewSavers(campaignId, props.onDetailChange)

  return (
    <div className="campaign-review">
      <CampaignReviewHeader campaignName={detail.campaign?.name} />
      {detail.campaign ? (
        <CampaignReviewWorldSection
          campaignId={campaignId}
          worldName={detail.campaign.worldName}
          worldSummary={detail.campaign.worldSummary}
          worldHistory={detail.campaign.worldHistory}
          onSaveSummary={savers.saveWorldSummary}
          onSaveHistory={savers.saveWorldHistory}
        />
      ) : null}
      <CampaignReviewStory storyThreads={detail.storyThreads} />
      <CampaignReviewRegions
        campaignId={campaignId}
        regionBlocks={regionBlocks}
        onSaveRegionDescription={savers.saveRegionDescription}
        onSaveNpcTraits={savers.saveNpcTraits}
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
