import type { KeyboardEvent } from 'react'
import type { PlayLogEntry } from '../../../main/narrationLog'

export interface PlayerActionPanelProps {
  entries: PlayLogEntry[]
  inputValue: string
  onInputChange: (value: string) => void
  onSubmit: () => void
  submitting: boolean
}

export function PlayerActionPanel(props: PlayerActionPanelProps): JSX.Element {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      props.onSubmit()
    }
  }

  return (
    <div className="play-view-panel play-view-player-panel">
      <h2>Your Actions</h2>
      <div className="play-view-log">
        {props.entries.map((entry) => (
          <p key={entry.id} className="play-view-log-entry">
            {entry.text}
          </p>
        ))}
      </div>
      <div className="play-view-input-row">
        <input
          type="text"
          placeholder="What do you do?"
          value={props.inputValue}
          disabled={props.submitting}
          onChange={(event) => props.onInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button type="button" disabled={props.submitting} onClick={props.onSubmit}>
          {props.submitting ? 'Resolving...' : 'Act'}
        </button>
      </div>
    </div>
  )
}
