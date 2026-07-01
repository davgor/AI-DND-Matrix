import type { GuidedCreationMessage } from '../../../shared/guidedCreation/types'

export interface GuidedConversationThreadProps {
  loading: boolean
  kickingOff: boolean
  messages: GuidedCreationMessage[]
  sending: boolean
  error: string | null
  threadRef: React.RefObject<HTMLDivElement | null>
}

export function GuidedConversationThread(props: GuidedConversationThreadProps): JSX.Element {
  return (
    <div className="guided-conversation-thread panel-card" ref={props.threadRef}>
      {props.loading ? (
        <p className="guided-conversation-empty">Loading conversation…</p>
      ) : props.messages.length === 0 ? (
        <p className="guided-conversation-empty">
          {props.kickingOff ? 'The DM is preparing your first question…' : 'Waiting for the DM…'}
        </p>
      ) : (
        props.messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === 'dm'
                ? 'guided-conversation-message guided-conversation-message-dm'
                : 'guided-conversation-message guided-conversation-message-player'
            }
          >
            <span className="guided-conversation-speaker">{message.role === 'dm' ? 'DM' : 'You'}</span>
            <p>{message.content}</p>
          </div>
        ))
      )}
      {props.sending || props.kickingOff ? (
        <p className="guided-conversation-status">The DM is thinking…</p>
      ) : null}
      {props.error ? <p className="guided-conversation-error">{props.error}</p> : null}
    </div>
  )
}
