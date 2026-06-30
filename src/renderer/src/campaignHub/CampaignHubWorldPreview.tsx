import type { PlayAwareHubSnapshot } from '../../../shared/campaignHub/types'
import { CampaignReviewStory } from '../campaignReview/CampaignReviewSections'
import { CampaignReviewReadOnlyRegionCard } from '../campaignReview/CampaignReviewReadOnlyRegionCard'
import { FormattedText } from '../shared/FormattedText'
import { buildHubRegionBlocks } from './hubUtils'

export interface CampaignHubWorldPreviewProps {
  snapshot: PlayAwareHubSnapshot
}

export function CampaignHubWorldPreview(props: CampaignHubWorldPreviewProps): JSX.Element {
  const { snapshot } = props
  const regionBlocks = buildHubRegionBlocks(snapshot)

  return (
    <div className="campaign-hub-world-preview">
      {snapshot.currentStateSummary ? (
        <section className="campaign-hub-section campaign-hub-current-state">
          <h2>Current state</h2>
          {FormattedText({ as: 'p', text: snapshot.currentStateSummary })}
        </section>
      ) : null}

      <CampaignReviewStory storyThreads={snapshot.storyThreads} playAware />

      <section className="campaign-hub-section campaign-hub-regions">
        <h2>Regions</h2>
        {regionBlocks.map(({ region, extras, npcs }) => (
          <CampaignReviewReadOnlyRegionCard
            key={region.id}
            region={region}
            extras={extras}
            npcs={npcs}
          />
        ))}
      </section>

      {snapshot.recentEvents.length > 0 ? (
        <section className="campaign-hub-section campaign-hub-recent-events">
          <h2>Recent events</h2>
          <ul>
            {snapshot.recentEvents.map((event) => (
              <li key={event.id}>
                <time dateTime={event.createdAt}>{formatEventDate(event.createdAt)}</time>
                {' — '}
                {event.summary}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function formatEventDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
