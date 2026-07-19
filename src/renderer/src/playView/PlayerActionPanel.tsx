import type { KeyboardEvent } from 'react'
import type { PlayLogEntry } from '../../../main/narrationLog'
import type { CombatStateSnapshot } from '../../../shared/combat/types'
import { SocialMessage } from './socialStreamParts'
import { sliceSocialWindow } from './socialStreamWindow'
import { useSocialStreamWindow } from './useSocialStreamWindow'

interface PlayerActionPanelProps {
  entries: PlayLogEntry[]
  inputValue: string
  onInputChange: (value: string) => void
  onSubmit: () => void
  submitting: boolean
  inputBlocked?: boolean
  playerImprisoned?: boolean
  combatState?: CombatStateSnapshot | null
  characterId?: string
}

export function turnStateMessage(props: PlayerActionPanelProps): string | null {
  if (props.submitting) {
    return 'Resolving your action…'
  }
  if (props.inputBlocked) {
    return 'Obituary in progress — actions blocked.'
  }
  if (props.playerImprisoned) {
    return 'You are imprisoned and cannot act freely.'
  }
  if (props.combatState && props.characterId) {
    const active = props.combatState.activeCombatant
    if (active.kind === 'player' && active.id === props.characterId) {
      return 'Your turn in combat.'
    }
    const activeName = props.combatState.initiativeOrder.find((entry) => entry.isActive)?.name
    return activeName ? `Waiting — ${activeName}'s turn.` : 'Waiting for combat turn.'
  }
  return null
}

export function handleComposerKeyDown(
  event: { key: string; shiftKey: boolean; preventDefault: () => void },
  input: { disabled: boolean; inputValue: string; onSubmit: () => void }
): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    if (!input.disabled && input.inputValue.trim()) {
      input.onSubmit()
    }
  }
}

export function PlayerActionPanel(props: PlayerActionPanelProps): JSX.Element {
  const { scrollRef, renderWindow } = useSocialStreamWindow(props.entries.length)
  const visibleEntries = sliceSocialWindow(props.entries, renderWindow)
  const disabled = props.submitting || props.inputBlocked === true
  const turnMessage = turnStateMessage(props)

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    handleComposerKeyDown(event, { disabled, inputValue: props.inputValue, onSubmit: props.onSubmit })
  }

  return (
    <div className="play-view-panel play-view-player-panel">
      <h2>Social</h2>
      <div ref={scrollRef} className="play-view-log play-view-player-log social-stream" role="log" aria-label="Social stream">
        {renderWindow.start > 0 ? (
          <p className="social-stream-history-hint" aria-hidden="true">
            Scroll up for earlier messages
          </p>
        ) : null}
        {visibleEntries.map((entry) => (
          <SocialMessage key={entry.id} entry={entry} />
        ))}
      </div>
      <footer className="play-view-composer">
        {turnMessage ? (
          <p className="play-view-turn-state" role="status">
            {turnMessage}
          </p>
        ) : null}
        <div className="play-view-input-row">
          <textarea
            rows={2}
            placeholder="What do you do? (Enter to submit, Shift+Enter for newline)"
            value={props.inputValue}
            disabled={disabled}
            onChange={(event) => props.onInputChange(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button type="button" disabled={disabled} onClick={props.onSubmit}>
            {props.submitting ? 'Resolving…' : 'Act'}
          </button>
        </div>
      </footer>
    </div>
  )
}
