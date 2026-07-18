import { Fragment } from 'react'
import type { CampaignDetail } from '../../../main/campaignIpc'
import type { CampaignRace } from '../../../shared/raceSelection/types'
import { CampaignReviewRegionCard } from './CampaignReviewRegionCard'

export function CampaignReviewHeader(props: { campaignName: string | undefined }): JSX.Element {
  return (
    <header className="campaign-review-header">
      <h1>{props.campaignName}</h1>
      <p className="campaign-review-lead">
        Review your world, starting regions, local history, quest hooks, and NPCs before character
        creation.
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
  regionBlocks: ReturnType<typeof buildRegionBlocks>
  campaignRaces?: CampaignRace[]
  onDeleteNpc: (npcId: string) => void
  onDeleteRegion: (regionId: string) => void
  onGenerateNpc: (regionId: string) => void
}): JSX.Element {
  return (
    <section className="campaign-review-regions">
      <h2>Regions</h2>
      {props.regionBlocks.map(({ region, extras, npcs }, index) => (
        <Fragment key={region.id}>
          <CampaignReviewRegionCard
            region={region}
            extras={extras}
            npcs={npcs}
            campaignRaces={props.campaignRaces}
            onDeleteNpc={props.onDeleteNpc}
            onDeleteRegion={() => props.onDeleteRegion(region.id)}
            onGenerateNpc={() => props.onGenerateNpc(region.id)}
          />
          {index < props.regionBlocks.length - 1 ? (
            <hr className="campaign-review-region-break" aria-hidden="true" />
          ) : null}
        </Fragment>
      ))}
    </section>
  )
}
