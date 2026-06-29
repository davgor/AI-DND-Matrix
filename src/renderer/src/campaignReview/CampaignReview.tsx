import { useState } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'
import type { EditNpcTraitsInput } from '../../../main/campaignEditIpc'
import { CampaignReviewGenerateModal } from './CampaignReviewGenerateModal'
import { CampaignReviewRegionCard } from './CampaignReviewRegionCard'
import { CampaignReviewFooter, CampaignReviewStory } from './CampaignReviewSections'
import './campaignReview.css'

export interface CampaignReviewProps {
  detail: CampaignDetail
  onDetailChange: (detail: CampaignDetail) => void
  onContinue: () => void
}

function buildRegionBlocks(detail: CampaignDetail) {
  const extrasById = new Map(detail.regionExtras.map((extras) => [extras.regionId, extras]))
  return detail.regions.map((region) => ({
    region,
    extras: extrasById.get(region.id),
    npcs: detail.npcs.filter((npc) => npc.regionId === region.id)
  }))
}

export function CampaignReview(props: CampaignReviewProps): JSX.Element {
  const { detail } = props
  const campaignId = detail.campaign?.id ?? ''
  const regionBlocks = buildRegionBlocks(detail)
  const [generateOpen, setGenerateOpen] = useState(false)

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
      <header className="campaign-review-header">
        <h1>{detail.campaign?.name}</h1>
        <p className="campaign-review-lead">
          Review your starting regions. Each includes local history, quest hooks, and NPCs to draw
          players in.
        </p>
      </header>

      <CampaignReviewStory storyThreads={detail.storyThreads} />

      <section className="campaign-review-regions">
        <h2>Regions</h2>
        {regionBlocks.map(({ region, extras, npcs }) => (
          <CampaignReviewRegionCard
            key={region.id}
            region={region}
            extras={extras}
            npcs={npcs}
            campaignId={campaignId}
            onSaveRegionDescription={saveRegionDescription}
            onSaveNpcTraits={saveNpcTraits}
          />
        ))}
      </section>

      <CampaignReviewFooter onGenerate={() => setGenerateOpen(true)} onContinue={props.onContinue} />

      {generateOpen ? (
        <CampaignReviewGenerateModal
          campaignId={campaignId}
          onDetailChange={props.onDetailChange}
          onClose={() => setGenerateOpen(false)}
        />
      ) : null}
    </div>
  )
}
