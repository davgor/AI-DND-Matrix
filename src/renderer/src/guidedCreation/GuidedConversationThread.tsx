import { useMemo, useRef } from 'react'
import type { GuidedCreationMessage } from '../../../shared/guidedCreation/types'
import { STREAM_ITEM_ID_ATTR, useScrollToNewStreamItem } from '../shared/scrollStreamItem'
import { ChatFormattedText } from './ChatFormattedText'

const THINKING_STATUS_ID = 'guided-conversation-thinking'

export interface GuidedConversationThreadProps {
  loading: boolean
  kickingOff: boolean
  messages: GuidedCreationMessage[]
  sending: boolean
  error: string | null
}

export function GuidedConversationThread(props: GuidedConversationThreadProps): JSX.Element {
  const threadRef = useRef<HTMLDivElement | null>(null)
  const streamItemIds = useMemo(() => {
    const ids = props.messages.map((message) => message.id)
    if (props.sending || props.kickingOff) {
      ids.push(THINKING_STATUS_ID)
    }
    return ids
  }, [props.kickingOff, props.messages, props.sending])

  useScrollToNewStreamItem(threadRef, streamItemIds)

  return (
    <div className="guided-conversation-thread panel-card" ref={threadRef}>
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
            {...{ [STREAM_ITEM_ID_ATTR]: message.id }}
            className={
              message.role === 'dm'
                ? 'guided-conversation-message guided-conversation-message-dm'
                : 'guided-conversation-message guided-conversation-message-player'
            }
          >
            <span className="guided-conversation-speaker">{message.role === 'dm' ? 'DM' : 'You'}</span>
            <ChatFormattedText text={message.content} />
          </div>
        ))
      )}
      {props.sending || props.kickingOff ? (
        <p className="guided-conversation-status" {...{ [STREAM_ITEM_ID_ATTR]: THINKING_STATUS_ID }}>
          The DM is thinking…
        </p>
      ) : null}
      {props.error ? <p className="guided-conversation-error">{props.error}</p> : null}
    </div>
  )
}
