import type { CampaignDetail } from '../../../main/campaignIpc'
import type { EditNpcTraitsInput } from '../../../main/campaignEditIpc'
import { CampaignReviewRegionCard } from './CampaignReviewRegionCard'

export function CampaignReviewHeader(props: { campaignName: string | undefined }): JSX.Element {
  return (
    <header className="campaign-review-header">
      <h1>{props.campaignName}</h1>
      <p className="campaign-review-lead">
        Review your starting regions. Each includes local history, quest hooks, and NPCs to draw
        players in.
      </p>
    </header>
  )
}

export function buildRegionBlocks(detail: CampaignDetail) {
  const extrasById = new Map(detail.regionExtras.map((extras) => [extras.regionId, extras]))
  return detail.regions.map((region) => ({
    region,
    extras: extrasById.get(region.id),
    npcs: detail.npcs.filter((npc) => npc.regionId === region.id)
  }))
}

export function CampaignReviewRegions(props: {
  campaignId: string
  regionBlocks: ReturnType<typeof buildRegionBlocks>
  onSaveRegionDescription: (regionId: string, description: string) => Promise<void>
  onSaveNpcTraits: (input: EditNpcTraitsInput) => Promise<void>
  onGenerateNpc: (regionId: string) => void
}): JSX.Element {
  return (
    <section className="campaign-review-regions">
      <h2>Regions</h2>
      {props.regionBlocks.map(({ region, extras, npcs }) => (
        <CampaignReviewRegionCard
          key={region.id}
          region={region}
          extras={extras}
          npcs={npcs}
          campaignId={props.campaignId}
          onSaveRegionDescription={props.onSaveRegionDescription}
          onSaveNpcTraits={props.onSaveNpcTraits}
          onGenerateNpc={() => props.onGenerateNpc(region.id)}
        />
      ))}
    </section>
  )
}
