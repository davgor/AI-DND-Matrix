import { useEffect, useRef } from 'react'
import type { GuidedMessagePhase, IdentityFoundationsStatus } from '../../../shared/guidedCreation/types'
import { FoundationProgress } from './FoundationProgress'
import { GuidedConversationComposer } from './GuidedConversationComposer'
import { GuidedConversationThread } from './GuidedConversationThread'
import { shouldDisableGuidedInput } from './guidedConversationState'
import { phaseDisplayMessages } from './phaseDisplayMessages'
import { useGuidedConversation } from './useGuidedConversation'
import './guidedConversation.css'

interface GuidedConversationShellProps {
  campaignId: string
  characterId: string
  phase: GuidedMessagePhase
  title: string
  subtitle: string
  phaseComplete: boolean
  onPhaseComplete?: () => void
  advanceLabel?: string
  onAdvance?: () => void
  onStateChange?: () => void
}

export function GuidedConversationShell(props: GuidedConversationShellProps): JSX.Element {
  const conversation = useGuidedConversation(
    props.campaignId,
    props.characterId,
    props.phase,
    props.onStateChange
  )
  const threadRef = useRef<HTMLDivElement | null>(null)
  const displayMessages = phaseDisplayMessages({
    conversation,
    campaignId: props.campaignId,
    characterId: props.characterId,
    phase: props.phase
  })

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
  }, [displayMessages.length, conversation.sending, conversation.kickingOff])

  return (
    <div className="guided-conversation">
      <GuidedConversationHeader
        title={props.title}
        subtitle={props.subtitle}
        phase={props.phase}
        foundations={conversation.state?.foundations}
      />
      <GuidedConversationThread
        threadRef={threadRef}
        loading={conversation.loading}
        kickingOff={conversation.kickingOff}
        messages={displayMessages}
        sending={conversation.sending}
        error={conversation.error}
      />
      <GuidedConversationComposer
        inputValue={conversation.inputValue}
        inputDisabled={shouldDisableGuidedInput(
          conversation.sending || conversation.kickingOff,
          props.phaseComplete
        )}
        sending={conversation.sending}
        phaseComplete={props.phaseComplete}
        advanceLabel={props.advanceLabel}
        onInputChange={conversation.setInputValue}
        onSend={() => void conversation.sendMessage()}
        onAdvance={props.onAdvance}
      />
    </div>
  )
}

function GuidedConversationHeader(props: {
  title: string
  subtitle: string
  phase: GuidedMessagePhase
  foundations: IdentityFoundationsStatus | undefined
}): JSX.Element {
  return (
    <header className="guided-conversation-header panel-card">
      <p className="eyebrow">Guided creation</p>
      <h1>{props.title}</h1>
      <p>{props.subtitle}</p>
      {props.phase === 'identity' && props.foundations ? (
        <FoundationProgress foundations={props.foundations} />
      ) : null}
    </header>
  )
}
