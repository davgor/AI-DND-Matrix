import { useMemo, useRef, type KeyboardEvent } from 'react'
import type { PlayLogEntry } from '../../../main/narrationLog'
import { STREAM_ITEM_ID_ATTR, useScrollToNewStreamItem } from '../shared/scrollStreamItem'
import { renderConversationLine } from './dmExpositionParts'

export interface PlayerActionPanelProps {
  entries: PlayLogEntry[]
  inputValue: string
  onInputChange: (value: string) => void
  onSubmit: () => void
  submitting: boolean
  inputBlocked?: boolean
}

export function PlayerActionPanel(props: PlayerActionPanelProps): JSX.Element {
  const logRef = useRef<HTMLDivElement | null>(null)
  const streamItemIds = useMemo(
    () => props.entries.map((entry) => entry.id),
    [props.entries]
  )

  useScrollToNewStreamItem(logRef, streamItemIds)

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      props.onSubmit()
    }
  }

  const disabled = props.submitting || props.inputBlocked === true

  return (
    <div className="play-view-panel play-view-player-panel">
      <h2>Conversation</h2>
      <div className="play-view-log" ref={logRef}>
        {props.entries.map((entry) => (
          <p key={entry.id} className="play-view-log-entry" {...{ [STREAM_ITEM_ID_ATTR]: entry.id }}>
            {renderConversationLine(entry)}
          </p>
        ))}
      </div>
      <div className="play-view-input-row">
        <input
          type="text"
          placeholder="What do you do?"
          value={props.inputValue}
          disabled={disabled}
          onChange={(event) => props.onInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button type="button" disabled={disabled} onClick={props.onSubmit}>
          {props.submitting ? 'Resolving...' : 'Act'}
        </button>
      </div>
    </div>
  )
}
