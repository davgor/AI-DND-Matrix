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
import { CampaignReviewFactionsSection } from './CampaignReviewFactionsSection'
import { CampaignReviewBestiarySection } from './CampaignReviewBestiarySection'
import { createCampaignReviewSavers } from './campaignReviewSavers'
import { useCampaignRaces } from './useCampaignRaces'
import './campaignReview.css'

interface CampaignReviewProps {
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

function CampaignReviewFactionsBlock(props: {
  factionsSummary: string
  factionPressure: NonNullable<CampaignDetail['campaign']>['factionPressure']
  factions: CampaignDetail['factions']
  relations: CampaignDetail['factionRelations']
  deities: CampaignDetail['deities']
  onSaveSummary: (summary: string) => Promise<void>
}): JSX.Element {
  return (
    <CampaignReviewFactionsSection
      factionsSummary={props.factionsSummary}
      factionPressure={props.factionPressure}
      factions={props.factions}
      relations={props.relations}
      deities={props.deities}
      onSaveSummary={props.onSaveSummary}
    />
  )
}

function CampaignReviewMainSections(props: {
  detail: CampaignDetail
  campaignId: string
  regionBlocks: ReturnType<typeof buildRegionBlocks>
  campaignRaces: ReturnType<typeof useCampaignRaces>
  savers: ReturnType<typeof createCampaignReviewSavers>
  onDetailChange: (detail: CampaignDetail) => void
  onGenerateNpc: (regionId: string) => void
}): JSX.Element {
  return (
    <>
      {props.detail.campaign ? (
        <CampaignReviewWorldBlock
          campaign={props.detail.campaign}
          campaignId={props.campaignId}
          onSaveSummary={props.savers.saveWorldSummary}
          onSaveHistory={props.savers.saveWorldHistory}
        />
      ) : null}
      <CampaignReviewPantheonBlock
        pantheonSummary={props.detail.campaign?.pantheonSummary ?? ''}
        deities={props.detail.deities}
        onSaveSummary={props.savers.savePantheonSummary}
      />
      <CampaignReviewFactionsBlock
        factionsSummary={props.detail.campaign?.factionsSummary ?? ''}
        factionPressure={props.detail.campaign?.factionPressure ?? 'light'}
        factions={props.detail.factions}
        relations={props.detail.factionRelations}
        deities={props.detail.deities}
        onSaveSummary={props.savers.saveFactionsSummary}
      />
      <CampaignReviewBestiarySection
        campaignId={props.campaignId}
        entries={props.detail.bestiary}
        onDetailChange={props.onDetailChange}
      />
      <CampaignReviewStory storyThreads={props.detail.storyThreads} />
      <CampaignReviewRegions
        regionBlocks={props.regionBlocks}
        campaignRaces={props.campaignRaces}
        onDeleteNpc={props.savers.deleteNpc}
        onDeleteRegion={props.savers.deleteRegion}
        onGenerateNpc={props.onGenerateNpc}
      />
    </>
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
      <CampaignReviewMainSections
        detail={detail}
        campaignId={campaignId}
        regionBlocks={regionBlocks}
        campaignRaces={campaignRaces}
        savers={savers}
        onDetailChange={props.onDetailChange}
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
