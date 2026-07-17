import type { GuidedCreationMessage, GuidedMessagePhase } from '../../../shared/guidedCreation/types'
import type { GuidedConversationController } from './useGuidedConversation'
import { messagesWithPendingPlayer } from './guidedConversationState'

export function phaseDisplayMessages(input: {
  conversation: GuidedConversationController
  campaignId: string
  characterId: string
  phase: GuidedMessagePhase
}): GuidedCreationMessage[] {
  const phaseMessages =
    input.conversation.state?.messages.filter((message) => message.phase === input.phase) ?? []
  return messagesWithPendingPlayer(
    phaseMessages,
    input.conversation.pendingPlayerMessage
      ? {
          content: input.conversation.pendingPlayerMessage,
          campaignId: input.campaignId,
          characterId: input.characterId,
          phase: input.phase
        }
      : null
  )
}
