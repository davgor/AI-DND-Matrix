import type { ReactNode } from 'react'
import type { PlayLogEntry } from '../../../main/narrationLog'
import type { TurnResult } from '../../../main/turnIpc'
import type { ExpositionStatus } from '../../../shared/inCampaignLayout/types'
import type { SceneSummaryInput } from '../../../shared/inCampaignLayout/sceneContext'
import { DmExpositionSceneHeader, renderFeedLine } from './dmExpositionParts'
import { usePinnedScroll } from './usePinnedScroll'

export interface DmExpositionPanelProps {
  entries: PlayLogEntry[]
  sceneContext: SceneSummaryInput
  expositionStatus: ExpositionStatus
  onRetryExposition: () => void
  showRolls: boolean
  lastCheck: TurnResult['check'] | null
  combatStrip?: ReactNode
  statusAlerts?: ReactNode
}

function formatRoll(check: NonNullable<TurnResult['check']>): string {
  return `Roll: ${check.roll} -> total ${check.total} vs DC ${check.dc} (${check.success ? 'success' : 'fail'})`
}

export function DmExpositionPanel(props: DmExpositionPanelProps): JSX.Element {
  const feedCount = props.entries.length + (props.showRolls && props.lastCheck ? 1 : 0)
  const { scrollRef } = usePinnedScroll<HTMLDivElement>(feedCount)

  return (
    <div className="play-view-panel play-view-dm-panel dm-exposition-panel">
      <DmExpositionSceneHeader
        entries={props.entries}
        sceneContext={props.sceneContext}
        expositionStatus={props.expositionStatus}
        onRetryExposition={props.onRetryExposition}
      />
      {props.combatStrip}
      {props.statusAlerts}
      <div ref={scrollRef} className="play-view-log dm-exposition-feed">
        {props.entries.map((entry) => (
          <p key={entry.id} className="play-view-log-entry">
            {renderFeedLine(entry)}
          </p>
        ))}
        {props.showRolls && props.lastCheck ? (
          <p className="play-view-log-entry play-view-roll-detail">{formatRoll(props.lastCheck)}</p>
        ) : null}
      </div>
    </div>
  )
}
