import type { PlayLogEntry } from '../../../main/narrationLog'
import type { TurnResult } from '../../../main/turnIpc'
import type { ExpositionStatus } from '../../../shared/inCampaignLayout/types'
import type { PendingAlignmentShift } from '../../../shared/alignment/types'
import { pickCurrentSceneText } from '../../../shared/inCampaignLayout/sceneContext'
import { AlignmentShiftWarningBanner, renderNpcLine } from './dmExpositionParts'

export interface DmExpositionPanelProps {
  entries: PlayLogEntry[]
  expositionStatus: ExpositionStatus
  onRetryExposition: () => void
  showRolls: boolean
  onToggleShowRolls: () => void
  lastCheck: TurnResult['check'] | null
  pendingAlignmentShift: PendingAlignmentShift | null
  playerAlignment: string | null
}

function formatRoll(check: NonNullable<TurnResult['check']>): string {
  return `Roll: ${check.roll} -> total ${check.total} vs DC ${check.dc} (${check.success ? 'success' : 'fail'})`
}

export function DmExpositionPanel(props: DmExpositionPanelProps): JSX.Element {
  const sceneText = pickCurrentSceneText(props.entries)
  const isLoading = props.expositionStatus.state === 'loading'

  return (
    <div className="play-view-panel play-view-dm-panel dm-exposition-panel">
      <header className="dm-exposition-header">
        <h2>Scene</h2>
        {props.pendingAlignmentShift ? (
          <AlignmentShiftWarningBanner
            pending={props.pendingAlignmentShift}
            playerAlignment={props.playerAlignment}
          />
        ) : null}
        {isLoading ? <p className="dm-exposition-status dm-exposition-loading">Updating scene…</p> : null}
        {props.expositionStatus.state === 'error' ? (
          <div className="dm-exposition-status dm-exposition-error" role="alert">
            <p>{props.expositionStatus.errorMessage}</p>
            <button type="button" onClick={props.onRetryExposition}>
              Retry
            </button>
          </div>
        ) : null}
        <div className="dm-exposition-scene" aria-live="polite">
          {sceneText ? (
            <p className="dm-exposition-scene-text">{sceneText}</p>
          ) : (
            <p className="dm-exposition-scene-empty">No scene set yet — act to begin.</p>
          )}
        </div>
      </header>
      <label className="play-view-roll-toggle">
        <input type="checkbox" checked={props.showRolls} onChange={props.onToggleShowRolls} />
        Show rolls
      </label>
      <div className="play-view-log dm-exposition-feed">
        {props.entries.map((entry) => (
          <p key={entry.id} className="play-view-log-entry">
            {entry.speaker === 'npc' || entry.speaker === 'partyMember'
              ? renderNpcLine(entry)
              : entry.text}
          </p>
        ))}
        {props.showRolls && props.lastCheck ? (
          <p className="play-view-log-entry play-view-roll-detail">{formatRoll(props.lastCheck)}</p>
        ) : null}
      </div>
    </div>
  )
}
