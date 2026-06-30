import type { PlayLogEntry } from '../../../main/narrationLog'
import type { TurnResult } from '../../../main/turnIpc'
import type { ExpositionStatus } from '../../../shared/inCampaignLayout/types'
import type { PendingAlignmentShift } from '../../../shared/alignment/types'
import { DmExpositionSceneHeader, renderFeedLine } from './dmExpositionParts'

export interface DmExpositionPanelProps {
  entries: PlayLogEntry[]
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

export function DmExpositionPanel(props: DmExpositionPanelProps): JSX.Element {
  return (
    <div className="play-view-panel play-view-dm-panel dm-exposition-panel">
      <DmExpositionSceneHeader
        entries={props.entries}
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
      <div className="play-view-log dm-exposition-feed">
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
