import type { KeyboardEvent, RefObject } from 'react'
import type { PlayLogEntry } from '../../../main/narrationLog'
import type { CombatStateSnapshot } from '../../../shared/combat/types'
import type { PersonMatchCandidate } from '../../../shared/journal'
import { useIncomingIdHighlights } from './incomingHighlight'
import {
  eligibleHighlightIds,
  entryIds,
  isNpcDialogueEntry
} from './incomingHighlight/incomingHighlightTargets'
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
  onOpenNpcDossier?: (npcId: string) => void
  personCandidates?: PersonMatchCandidate[]
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

function SocialStreamLog(props: {
  entries: PlayLogEntry[]
  windowStart: number
  scrollRef: RefObject<HTMLDivElement>
  highlightedIds: ReadonlySet<string>
  onOpenNpcDossier?: (npcId: string) => void
  personCandidates?: PersonMatchCandidate[]
}): JSX.Element {
  return (
    <div
      ref={props.scrollRef}
      className="play-view-log play-view-player-log social-stream"
      role="log"
      aria-label="Social stream"
    >
      {props.windowStart > 0 ? (
        <p className="social-stream-history-hint" aria-hidden="true">
          Scroll up for earlier messages
        </p>
      ) : null}
      {props.entries.map((entry) => (
        <SocialMessage
          key={entry.id}
          entry={entry}
          highlighted={props.highlightedIds.has(entry.id)}
          onOpenNpcDossier={props.onOpenNpcDossier}
          personCandidates={props.personCandidates}
        />
      ))}
    </div>
  )
}

function SocialComposer(props: {
  turnMessage: string | null
  input: {
    value: string
    disabled: boolean
    submitting: boolean
    onChange: (value: string) => void
    onSubmit: () => void
  }
}): JSX.Element {
  const { input } = props
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    handleComposerKeyDown(event, {
      disabled: input.disabled,
      inputValue: input.value,
      onSubmit: input.onSubmit
    })
  }
  return (
    <footer className="play-view-composer">
      {props.turnMessage ? (
        <p className="play-view-turn-state" role="status">
          {props.turnMessage}
        </p>
      ) : null}
      <div className="play-view-input-row">
        <textarea
          rows={2}
          placeholder="What do you do? (Enter to submit, Shift+Enter for newline)"
          value={input.value}
          disabled={input.disabled}
          onChange={(event) => input.onChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button type="button" disabled={input.disabled} onClick={input.onSubmit}>
          {input.submitting ? 'Resolving…' : 'Act'}
        </button>
      </div>
    </footer>
  )
}

export function PlayerActionPanel(props: PlayerActionPanelProps): JSX.Element {
  const { scrollRef, renderWindow } = useSocialStreamWindow(props.entries.length)
  const visibleEntries = sliceSocialWindow(props.entries, renderWindow)
  const highlightedIds = useIncomingIdHighlights(
    entryIds(props.entries),
    eligibleHighlightIds(props.entries, isNpcDialogueEntry)
  )
  const disabled = props.submitting || props.inputBlocked === true

  return (
    <div className="play-view-panel play-view-player-panel">
      <h2>Social</h2>
      <SocialStreamLog
        entries={visibleEntries}
        windowStart={renderWindow.start}
        scrollRef={scrollRef}
        highlightedIds={highlightedIds}
        onOpenNpcDossier={props.onOpenNpcDossier}
        personCandidates={props.personCandidates}
      />
      <SocialComposer
        turnMessage={turnStateMessage(props)}
        input={{
          value: props.inputValue,
          disabled,
          submitting: props.submitting,
          onChange: props.onInputChange,
          onSubmit: props.onSubmit
        }}
      />
    </div>
  )
}
