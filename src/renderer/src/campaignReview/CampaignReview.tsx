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
import { CampaignReviewPantheonSection } from './CampaignReviewPantheonSection'
import { createCampaignReviewSavers } from './campaignReviewSavers'
import { useCampaignRaces } from './useCampaignRaces'
import './campaignReview.css'

export interface CampaignReviewProps {
  detail: CampaignDetail
  onDetailChange: (detail: CampaignDetail) => void
  onContinue: () => void
}

function CampaignReviewWorldBlock(props: {
  campaign: NonNullable<CampaignDetail['campaign']>
  campaignId: string
  onSaveSummary: (summary: string) => Promise<void>
  onSaveHistory: (history: string) => Promise<void>
}): JSX.Element {
  return (
    <CampaignReviewWorldSection
      campaignId={props.campaignId}
      worldName={props.campaign.worldName}
      worldSummary={props.campaign.worldSummary}
      worldHistory={props.campaign.worldHistory}
      onSaveSummary={props.onSaveSummary}
      onSaveHistory={props.onSaveHistory}
    />
  )
}

function CampaignReviewPantheonBlock(props: {
  pantheonSummary: string
  deities: CampaignDetail['deities']
  onSaveSummary: (summary: string) => Promise<void>
}): JSX.Element {
  return (
    <CampaignReviewPantheonSection
      pantheonSummary={props.pantheonSummary}
      deities={props.deities}
      onSaveSummary={props.onSaveSummary}
    />
  )
}

export function CampaignReview(props: CampaignReviewProps): JSX.Element {
  const { detail } = props
  const campaignId = detail.campaign?.id ?? ''
  const regionBlocks = buildRegionBlocks(detail)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generateNpcRegionId, setGenerateNpcRegionId] = useState<string | null>(null)
  const campaignRaces = useCampaignRaces(campaignId, detail.npcs)
  const generateNpcRegion = regionBlocks.find((block) => block.region.id === generateNpcRegionId)
  const savers = createCampaignReviewSavers(campaignId, props.onDetailChange)

  return (
    <div className="campaign-review">
      <CampaignReviewHeader campaignName={detail.campaign?.name} />
      {detail.campaign ? (
        <CampaignReviewWorldBlock
          campaign={detail.campaign}
          campaignId={campaignId}
          onSaveSummary={savers.saveWorldSummary}
          onSaveHistory={savers.saveWorldHistory}
        />
      ) : null}
      <CampaignReviewPantheonBlock
        pantheonSummary={detail.campaign?.pantheonSummary ?? ''}
        deities={detail.deities}
        onSaveSummary={savers.savePantheonSummary}
      />
      <CampaignReviewStory storyThreads={detail.storyThreads} />
      <CampaignReviewRegions
        regionBlocks={regionBlocks}
        campaignRaces={campaignRaces}
        onDeleteNpc={savers.deleteNpc}
        onDeleteRegion={savers.deleteRegion}
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
