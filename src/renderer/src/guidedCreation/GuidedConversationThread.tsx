import type { GuidedCreationMessage } from '../../../shared/guidedCreation/types'
import { useDmThinkingStatus } from './useDmThinkingStatus'

export interface GuidedConversationThreadProps {
  loading: boolean
  kickingOff: boolean
  messages: GuidedCreationMessage[]
  sending: boolean
  error: string | null
  threadRef: React.RefObject<HTMLDivElement | null>
}

export function GuidedConversationThread(props: GuidedConversationThreadProps): JSX.Element {
  const thinking = props.sending || props.kickingOff
  const thinkingStatus = useDmThinkingStatus(thinking)
  const showLoading = props.loading && props.messages.length === 0
  const showIdleEmpty = !showLoading && props.messages.length === 0 && !thinking

  return (
    <div className="guided-conversation-thread panel-card" ref={props.threadRef}>
      {showLoading ? (
        <p className="guided-conversation-empty">Loading conversation…</p>
      ) : showIdleEmpty ? (
        <p className="guided-conversation-empty">Waiting for the DM…</p>
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
      {thinkingStatus ? (
        <p className="guided-conversation-status" aria-live="polite">
          {thinkingStatus}
        </p>
      ) : null}
      {props.error ? <p className="guided-conversation-error">{props.error}</p> : null}
    </div>
  )
}
