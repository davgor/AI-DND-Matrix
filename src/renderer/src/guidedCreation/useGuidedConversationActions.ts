import type {
  GuidedCreationSendMessageResult,
  GuidedMessagePhase
} from '../../../shared/guidedCreation/types'
import type { GuidedRefresh } from './guidedIdentityKickoff'
import { useGuidedGenerateReply } from './useGuidedGenerateReply'
import { useGuidedIdentityKickoff } from './useGuidedIdentityKickoff'
import { useGuidedSendMessage } from './useGuidedSendMessage'
import type { useGuidedRefresh } from './useGuidedRefresh'

type GuidedState = ReturnType<typeof useGuidedRefresh>['state']

interface GuidedConversationActionsInput {
  campaignId: string
  characterId: string
  phase: GuidedMessagePhase
  loading: boolean
  state: GuidedState
  refresh: GuidedRefresh
  kickingOff: boolean
  sending: boolean
  generating: boolean
  inputValue: string
  setKickingOff: (value: boolean) => void
  setSending: (value: boolean) => void
  setGenerating: (value: boolean) => void
  setError: (value: string | null) => void
  setInputValue: (value: string) => void
  setPendingPlayerMessage: (value: string | null) => void
  onStateChange?: () => void
}

export function useGuidedConversationActions(input: GuidedConversationActionsInput): {
  sendMessage: () => Promise<GuidedCreationSendMessageResult | null>
  generateReply: () => Promise<void>
} {
  const ids = {
    campaignId: input.campaignId,
    characterId: input.characterId,
    phase: input.phase
  }
  useGuidedIdentityKickoff({
    ...ids,
    loading: input.loading,
    kickingOff: input.kickingOff,
    sending: input.sending,
    state: input.state,
    refresh: input.refresh,
    setKickingOff: input.setKickingOff,
    setError: input.setError,
    onStateChange: input.onStateChange
  })
  const sendMessage = useGuidedSendMessage({
    ...ids,
    inputValue: input.inputValue,
    sending: input.sending,
    setSending: input.setSending,
    setError: input.setError,
    setInputValue: input.setInputValue,
    setPendingPlayerMessage: input.setPendingPlayerMessage,
    refresh: input.refresh,
    onStateChange: input.onStateChange
  })
  const generateReply = useGuidedGenerateReply({
    ...ids,
    inputValue: input.inputValue,
    sending: input.sending,
    kickingOff: input.kickingOff,
    generating: input.generating,
    setGenerating: input.setGenerating,
    setError: input.setError,
    setInputValue: input.setInputValue
  })
  return { sendMessage, generateReply }
}
