import type { RegionExtras } from '../../../main/campaignIpc'
import type { Npc } from '../../../db/repositories/npcs'
import type { Region } from '../../../db/repositories/regions'
import { FormattedText } from '../shared/FormattedText'
import { CampaignReviewPanel } from './CampaignReviewPanel'
import { CampaignReviewReadOnlyNpcCard } from './CampaignReviewReadOnlyNpcCard'
import { CampaignReviewRegionExtras } from './CampaignReviewRegionExtras'

export function CampaignReviewReadOnlyRegionCard(props: {
  region: Region
  extras: RegionExtras | undefined
  npcs: Npc[]
  questAvailableCount?: number
}): JSX.Element {
  const { region, extras, npcs, questAvailableCount = 0 } = props

  return (
    <article className="campaign-review-region-card">
      <h3>
        {region.name}
        {questAvailableCount > 0 ? (
          <span className="campaign-review-quest-available-badge">Quest available</span>
        ) : null}
      </h3>
      {region.status.destroyed ? (
        <p className="campaign-review-region-destroyed">
          This region has been destroyed
          {region.status.cause ? `: ${region.status.cause}` : ''}.
        </p>
      ) : null}
      <CampaignReviewPanel legend="Overview">
        {FormattedText({ as: 'p', className: 'campaign-review-readonly-value', text: region.description })}
      </CampaignReviewPanel>
      {extras ? <CampaignReviewRegionExtras extras={extras} /> : null}
      <div className="campaign-review-npcs">
        <h4>NPCs</h4>
        {npcs.map((npc) => (
          <CampaignReviewReadOnlyNpcCard key={npc.id} npc={npc} />
        ))}
      </div>
    </article>
  )
}
