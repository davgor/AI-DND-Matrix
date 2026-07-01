import type { GuidedMessagePhase } from '../../../shared/guidedCreation/types'
import { FoundationProgress } from './FoundationProgress'
import { GuidedConversationComposer } from './GuidedConversationComposer'
import { GuidedConversationThread } from './GuidedConversationThread'
import { shouldDisableGuidedInput } from './guidedConversationState'
import { useGuidedConversation } from './useGuidedConversation'
import './guidedConversation.css'

export interface GuidedConversationShellProps {
  campaignId: string
  characterId: string
  phase: GuidedMessagePhase
  title: string
  subtitle: string
  phaseComplete: boolean
  onPhaseComplete?: () => void
  advanceLabel?: string
  onAdvance?: () => void
  handoffLabel?: string
  onHandoff?: () => void
  onStateChange?: () => void
}

export function GuidedConversationShell(props: GuidedConversationShellProps): JSX.Element {
  const conversation = useGuidedConversation(
    props.campaignId,
    props.characterId,
    props.phase,
    props.onStateChange
  )
  const phaseMessages =
    conversation.state?.messages.filter((message) => message.phase === props.phase) ?? []

  return (
    <div className="guided-conversation">
      <header className="guided-conversation-header panel-card">
        <p className="eyebrow">Guided creation</p>
        <h1>{props.title}</h1>
        <p>{props.subtitle}</p>
        {props.phase === 'identity' && conversation.state ? (
          <FoundationProgress foundations={conversation.state.foundations} />
        ) : null}
      </header>
      <GuidedConversationThread
        loading={conversation.loading}
        kickingOff={conversation.kickingOff}
        messages={phaseMessages}
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
        handoffLabel={props.handoffLabel}
        onInputChange={conversation.setInputValue}
        onSend={() => void conversation.sendMessage()}
        onAdvance={props.onAdvance}
        onHandoff={props.onHandoff}
      />
    </div>
  )
}
