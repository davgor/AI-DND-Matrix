import type { PlayLogEntry } from '../../../main/narrationLog'
import type { TurnResult } from '../../../main/turnIpc'

export interface DmNarrationPanelProps {
  entries: PlayLogEntry[]
  showRolls: boolean
  onToggleShowRolls: () => void
  lastCheck: TurnResult['check'] | null
}

function formatRoll(check: NonNullable<TurnResult['check']>): string {
  return `Roll: ${check.roll} -> total ${check.total} vs DC ${check.dc} (${check.success ? 'success' : 'fail'})`
}

export function DmNarrationPanel(props: DmNarrationPanelProps): JSX.Element {
  return (
    <div className="play-view-panel play-view-dm-panel">
      <h2>DM Narration</h2>
      <label className="play-view-roll-toggle">
        <input type="checkbox" checked={props.showRolls} onChange={props.onToggleShowRolls} />
        Show rolls
      </label>
      <div className="play-view-log">
        {props.entries.map((entry) => (
          <p key={entry.id} className="play-view-log-entry">
            {entry.speaker === 'npc' || entry.speaker === 'partyMember' ? <em>{entry.text}</em> : entry.text}
          </p>
        ))}
        {props.showRolls && props.lastCheck && (
          <p className="play-view-log-entry play-view-roll-detail">{formatRoll(props.lastCheck)}</p>
        )}
      </div>
    </div>
  )
}
