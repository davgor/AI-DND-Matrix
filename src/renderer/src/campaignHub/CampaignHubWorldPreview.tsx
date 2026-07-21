import type { PlayAwareHubSnapshot } from '../../../shared/campaignHub/types'
import type { CampaignRace } from '../../../shared/raceSelection/types'
import { CampaignReviewStory } from '../campaignReview/CampaignReviewSections'
import { CampaignReviewWorldContent } from '../campaignReview/CampaignReviewWorldContent'
import { CampaignReviewPantheonSection } from '../campaignReview/CampaignReviewPantheonSection'
import { CampaignReviewReadOnlyRegionCard } from '../campaignReview/CampaignReviewReadOnlyRegionCard'
import { FormattedText } from '../shared/FormattedText'
import { buildHubRegionBlocks } from './hubUtils'
import { HubQuestTeaser } from './HubQuestTeaser'
import { HubSessionRecapSection } from './HubSessionRecapSection'
import type { HubSessionRecapState } from './useHubSessionRecap'

function HubCurrentStateSection(props: { summary: string }): JSX.Element {
  return (
    <section className="campaign-hub-section campaign-hub-current-state">
      <h2>Current state</h2>
      {FormattedText({ as: 'p', text: props.summary })}
    </section>
  )
}

function HubRegionsSection(props: {
  regionBlocks: ReturnType<typeof buildHubRegionBlocks>
  campaignRaces?: CampaignRace[]
  availabilityByRegion: Map<string, number>
}): JSX.Element {
  return (
    <section className="campaign-hub-section campaign-hub-regions">
      <h2>Regions</h2>
      {props.regionBlocks.map(({ region, extras, npcs }) => (
        <CampaignReviewReadOnlyRegionCard
          key={region.id}
          region={region}
          extras={extras}
          npcs={npcs}
          campaignRaces={props.campaignRaces}
          questAvailableCount={props.availabilityByRegion.get(region.id) ?? 0}
        />
      ))}
    </section>
  )
}

export interface CampaignHubWorldPreviewProps {
  snapshot: PlayAwareHubSnapshot
  sessionRecap: HubSessionRecapState
  campaignRaces?: CampaignRace[]
  focusCharacterId?: string | null
  onViewWorldHistory?: () => void
}

export function CampaignHubWorldPreview(props: CampaignHubWorldPreviewProps): JSX.Element {
  const { snapshot } = props
  const regionBlocks = buildHubRegionBlocks(snapshot)
  const focusSummary =
    props.focusCharacterId === undefined || props.focusCharacterId === null
      ? snapshot.questSummariesByCharacterId[0]
      : snapshot.questSummariesByCharacterId.find((row) => row.characterId === props.focusCharacterId)
  const availabilityByRegion = new Map(
    snapshot.regionQuestAvailability.map((row) => [row.regionId, row.availableQuestCount])
  )

  return (
    <div className="campaign-hub-world-preview">
      <HubQuestTeaser summary={focusSummary} />
      {snapshot.campaign ? (
        <CampaignReviewWorldContent
          worldName={snapshot.campaign.worldName}
          worldSummary={snapshot.campaign.worldSummary}
          onViewHistory={
            snapshot.campaign.worldHistory && props.onViewWorldHistory
              ? props.onViewWorldHistory
              : undefined
          }
        />
      ) : null}
      <CampaignReviewPantheonSection
        pantheonSummary={snapshot.campaign?.pantheonSummary ?? ''}
        deities={snapshot.deities}
        readOnly
      />
      {snapshot.currentStateSummary ? <HubCurrentStateSection summary={snapshot.currentStateSummary} /> : null}
      <CampaignReviewStory storyThreads={snapshot.storyThreads} playAware />
      <HubRegionsSection
        regionBlocks={regionBlocks}
        campaignRaces={props.campaignRaces}
        availabilityByRegion={availabilityByRegion}
      />
      <HubSessionRecapSection recap={props.sessionRecap} />
    </div>
  )
}
