import type { AskDmMessage } from '../../../shared/askDm/types'

export function AskDmTranscript(props: {
  messages: AskDmMessage[]
  loading: boolean
  sending: boolean
  error: string | null
}): JSX.Element {
  const showLoading = props.loading && props.messages.length === 0
  const showEmpty = !showLoading && props.messages.length === 0 && !props.sending

  return (
    <div className="ask-dm-transcript" aria-live="polite">
      {showLoading ? <p className="ask-dm-empty">Loading OOC history…</p> : null}
      {showEmpty ? (
        <p className="ask-dm-empty">Ask rules questions or table talk — out of character only.</p>
      ) : null}
      {props.messages.map((message) => (
        <div
          key={message.id}
          className={
            message.role === 'dm'
              ? 'ask-dm-message ask-dm-message-dm'
              : 'ask-dm-message ask-dm-message-player'
          }
        >
          <span className="ask-dm-speaker">{message.role === 'dm' ? 'DM' : 'You'}</span>
          <p>{message.content}</p>
        </div>
      ))}
      {props.sending ? <p className="ask-dm-status">DM is thinking…</p> : null}
      {props.error ? <p className="ask-dm-error">{props.error}</p> : null}
    </div>
  )
}

export function AskDmComposer(props: {
  inputValue: string
  sending: boolean
  loading: boolean
  onInputChange: (value: string) => void
  onSend: () => void
}): JSX.Element {
  const disabled = props.loading || props.sending

  return (
    <div className="ask-dm-composer">
      <textarea
        value={props.inputValue}
        disabled={disabled}
        placeholder="Ask the DM (out of character)…"
        aria-label="Ask the DM message"
        onChange={(event) => props.onInputChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            props.onSend()
          }
        }}
      />
      <button
        type="button"
        className="btn ask-dm-send"
        disabled={disabled || !props.inputValue.trim()}
        onClick={props.onSend}
      >
        {props.sending ? 'Sending…' : 'Send'}
      </button>
    </div>
  )
}

export function AskDmModalBody(props: {
  messages: AskDmMessage[]
  loading: boolean
  sending: boolean
  error: string | null
  inputValue: string
  onInputChange: (value: string) => void
  onSend: () => void
}): JSX.Element {
  return (
    <div className="ask-dm-body">
      <p className="ask-dm-ooc-label">Out of character</p>
      {AskDmTranscript({
        messages: props.messages,
        loading: props.loading,
        sending: props.sending,
        error: props.error
      })}
      {AskDmComposer({
        inputValue: props.inputValue,
        sending: props.sending,
        loading: props.loading,
        onInputChange: props.onInputChange,
        onSend: props.onSend
      })}
    </div>
  )
}
