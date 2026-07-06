import { Fragment } from 'react'
import type { RegionExtras } from '../../../main/campaignIpc'
import type { Npc } from '../../../db/repositories/npcs'
import type { Region } from '../../../db/repositories/regions'
import { FormattedText } from '../shared/FormattedText'
import { CampaignReviewNpcCard } from './CampaignReviewNpcCard'
import { CampaignReviewRegionExtras } from './CampaignReviewRegionExtras'

const DELETE_REGION_TOOLTIP = 'Delete this region and all of its NPCs permanently'

function CampaignReviewRegionHeader(props: {
  name: string
  onDeleteRegion: () => void
}): JSX.Element {
  return (
    <div className="campaign-review-region-header">
      <h3>{props.name}</h3>
      <button
        type="button"
        className="campaign-review-icon-delete"
        title={DELETE_REGION_TOOLTIP}
        aria-label={DELETE_REGION_TOOLTIP}
        onClick={props.onDeleteRegion}
      >
        <span className="campaign-review-icon-delete-symbol" aria-hidden="true">
          ×
        </span>
      </button>
    </div>
  )
}

export function CampaignReviewRegionCard(props: {
  region: Region
  extras: RegionExtras | undefined
  npcs: Npc[]
  onDeleteNpc: (npcId: string) => void
  onDeleteRegion: () => void
  onGenerateNpc: () => void
}): JSX.Element {
  const { region, extras, npcs } = props

  return (
    <article className="campaign-review-region-card">
      <CampaignReviewRegionHeader name={region.name} onDeleteRegion={props.onDeleteRegion} />
      <div className="campaign-review-readonly">
        <strong>Overview</strong>
        {FormattedText({ as: 'p', text: region.description })}
      </div>
      {extras ? <CampaignReviewRegionExtras extras={extras} /> : null}
      <div className="campaign-review-npcs">
        <div className="campaign-review-npcs-header">
          <h4>NPCs</h4>
          <button type="button" className="campaign-review-generate-npc" onClick={props.onGenerateNpc}>
            Generate NPC
          </button>
        </div>
        {npcs.map((npc, index) => (
          <Fragment key={npc.id}>
            <CampaignReviewNpcCard
              npc={npc}
              onDeleteNpc={() => props.onDeleteNpc(npc.id)}
            />
            {index < npcs.length - 1 ? (
              <hr className="campaign-review-npc-break" aria-hidden="true" />
            ) : null}
          </Fragment>
        ))}
      </div>
    </article>
  )
}
