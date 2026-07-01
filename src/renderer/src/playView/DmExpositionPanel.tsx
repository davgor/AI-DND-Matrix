import { useMemo, useRef } from 'react'
import type { PlayLogEntry } from '../../../main/narrationLog'
import type { TurnResult } from '../../../main/turnIpc'
import type { ExpositionStatus } from '../../../shared/inCampaignLayout/types'
import type { PendingAlignmentShift } from '../../../shared/alignment/types'
import { STREAM_ITEM_ID_ATTR, useScrollToNewStreamItem } from '../shared/scrollStreamItem'
import { DmExpositionSceneHeader, renderFeedLine } from './dmExpositionParts'

export interface DmExpositionPanelProps {
  sceneText: string | null
  flavorEntries: PlayLogEntry[]
  expositionStatus: ExpositionStatus
  onRetryExposition: () => void
  showRolls: boolean
  onToggleShowRolls: () => void
  lastCheck: TurnResult['check'] | null
  pendingAlignmentShift: PendingAlignmentShift | null
  playerAlignment: string | null
  defeatDispositionNarration: string | null
  xpNarration: string | null
  lootNarration: string | null
  playerImprisoned: boolean
}

function formatRoll(check: NonNullable<TurnResult['check']>): string {
  return `Roll: ${check.roll} -> total ${check.total} vs DC ${check.dc} (${check.success ? 'success' : 'fail'})`
}

function rollDetailStreamId(check: NonNullable<TurnResult['check']>): string {
  return `roll-${check.roll}-${check.total}-${check.dc}`
}

export function DmExpositionPanel(props: DmExpositionPanelProps): JSX.Element {
  const feedRef = useRef<HTMLDivElement | null>(null)
  const streamItemIds = useMemo(() => {
    const ids = props.flavorEntries.map((entry) => entry.id)
    if (props.showRolls && props.lastCheck) {
      ids.push(rollDetailStreamId(props.lastCheck))
    }
    return ids
  }, [props.flavorEntries, props.lastCheck, props.showRolls])

  useScrollToNewStreamItem(feedRef, streamItemIds)

  return (
    <div className="play-view-panel play-view-dm-panel dm-exposition-panel">
      <DmExpositionSceneHeader
        sceneText={props.sceneText}
        expositionStatus={props.expositionStatus}
        onRetryExposition={props.onRetryExposition}
        pendingAlignmentShift={props.pendingAlignmentShift}
        playerAlignment={props.playerAlignment}
        defeatDispositionNarration={props.defeatDispositionNarration}
        xpNarration={props.xpNarration}
        lootNarration={props.lootNarration}
        playerImprisoned={props.playerImprisoned}
      />
      <label className="play-view-roll-toggle">
        <input type="checkbox" checked={props.showRolls} onChange={props.onToggleShowRolls} />
        Show rolls
      </label>
      <div className="play-view-log dm-exposition-feed" ref={feedRef}>
        {props.flavorEntries.map((entry) => (
          <p key={entry.id} className="play-view-log-entry" {...{ [STREAM_ITEM_ID_ATTR]: entry.id }}>
            {renderFeedLine(entry)}
          </p>
        ))}
        {props.showRolls && props.lastCheck ? (
          <p
            className="play-view-log-entry play-view-roll-detail"
            {...{ [STREAM_ITEM_ID_ATTR]: rollDetailStreamId(props.lastCheck) }}
          >
            {formatRoll(props.lastCheck)}
          </p>
        ) : null}
      </div>
    </div>
  )
}
