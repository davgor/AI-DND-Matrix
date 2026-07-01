export interface GuidedConversationComposerProps {
  inputValue: string
  inputDisabled: boolean
  sending: boolean
  phaseComplete: boolean
  advanceLabel?: string
  handoffLabel?: string
  onInputChange: (value: string) => void
  onSend: () => void
  onAdvance?: () => void
  onHandoff?: () => void
}

function GuidedConversationActions(props: GuidedConversationComposerProps): JSX.Element | null {
  if (props.handoffLabel && props.onHandoff) {
    return (
      <button
        type="button"
        className="guided-conversation-advance"
        disabled={props.inputDisabled || props.sending}
        onClick={props.onHandoff}
      >
        {props.handoffLabel}
      </button>
    )
  }
  if (!props.handoffLabel && props.phaseComplete && props.advanceLabel && props.onAdvance) {
    return (
      <button type="button" className="guided-conversation-advance" onClick={props.onAdvance}>
        {props.advanceLabel}
      </button>
    )
  }
  return null
}

export function GuidedConversationComposer(props: GuidedConversationComposerProps): JSX.Element {
  return (
    <div className="guided-conversation-composer panel-card">
      <textarea
        value={props.inputValue}
        disabled={props.inputDisabled}
        placeholder={props.phaseComplete ? 'This phase is complete.' : 'Type your reply…'}
        onChange={(event) => props.onInputChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            props.onSend()
          }
        }}
      />
      <div className="guided-conversation-actions">
        <button
          type="button"
          disabled={props.inputDisabled || !props.inputValue.trim()}
          onClick={props.onSend}
        >
          {props.sending ? 'Sending…' : 'Send'}
        </button>
        <GuidedConversationActions {...props} />
      </div>
    </div>
  )
}
