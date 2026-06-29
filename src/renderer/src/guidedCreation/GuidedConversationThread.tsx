import type { GuidedCreationMessage } from '../../../shared/guidedCreation/types'

export interface GuidedConversationThreadProps {
  loading: boolean
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
        <p className="guided-conversation-empty">The DM is ready when you are. Share your first answer below.</p>
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
      {props.sending ? <p className="guided-conversation-status">The DM is thinking…</p> : null}
      {props.error ? <p className="guided-conversation-error">{props.error}</p> : null}
    </div>
  )
}
