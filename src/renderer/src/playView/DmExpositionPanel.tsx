import type { ReactNode } from 'react'
import type { PlayLogEntry } from '../../../main/narrationLog'
import type { TurnResult } from '../../../main/turnIpc'
import type { ExpositionStatus } from '../../../shared/inCampaignLayout/types'
import type { SceneSummaryInput } from '../../../shared/inCampaignLayout/sceneContext'
import type { PersonMatchCandidate } from '../../../shared/journal'
import {
  DmExpositionSceneHeader,
  renderFeedLine,
  type ScenePersonLinkProps
} from './dmExpositionParts'
import {
  incomingHighlightClassName,
  useIncomingIdHighlights
} from './incomingHighlight'
import {
  eligibleHighlightIds,
  entryIds,
  isSceneSettingEntry
} from './incomingHighlight/incomingHighlightTargets'
import { usePinnedScroll } from './usePinnedScroll'

interface DmExpositionPanelProps {
  entries: PlayLogEntry[]
  sceneContext: SceneSummaryInput
  expositionStatus: ExpositionStatus
  onRetryExposition: () => void
  showRolls: boolean
  lastCheck: TurnResult['check'] | null
  combatStrip?: ReactNode
  statusAlerts?: ReactNode
  personCandidates?: PersonMatchCandidate[]
  onPersonActivate?: (npcId: string) => void
}

function formatRoll(check: NonNullable<TurnResult['check']>): string {
  return `Roll: ${check.roll} -> total ${check.total} vs DC ${check.dc} (${check.success ? 'success' : 'fail'})`
}

export function DmExpositionPanel(props: DmExpositionPanelProps): JSX.Element {
  const feedCount = props.entries.length + (props.showRolls && props.lastCheck ? 1 : 0)
  const { scrollRef } = usePinnedScroll<HTMLDivElement>(feedCount)
  const highlightedIds = useIncomingIdHighlights(
    entryIds(props.entries),
    eligibleHighlightIds(props.entries, isSceneSettingEntry)
  )
  const personLink: ScenePersonLinkProps = {
    personCandidates: props.personCandidates,
    onPersonActivate: props.onPersonActivate
  }

  return (
    <div className="play-view-panel play-view-dm-panel dm-exposition-panel">
      <DmExpositionSceneHeader
        entries={props.entries}
        sceneContext={props.sceneContext}
        expositionStatus={props.expositionStatus}
        onRetryExposition={props.onRetryExposition}
        personCandidates={props.personCandidates}
        onPersonActivate={props.onPersonActivate}
      />
      {props.combatStrip}
      {props.statusAlerts}
      <div ref={scrollRef} className="play-view-log dm-exposition-feed">
        {props.entries.map((entry) => (
          <p
            key={entry.id}
            data-entry-id={entry.id}
            className={incomingHighlightClassName(
              highlightedIds.has(entry.id),
              'play-view-log-entry'
            )}
          >
            {renderFeedLine(entry, personLink)}
          </p>
        ))}
        {props.showRolls && props.lastCheck ? (
          <p className="play-view-log-entry play-view-roll-detail">{formatRoll(props.lastCheck)}</p>
        ) : null}
      </div>
    </div>
  )
}
