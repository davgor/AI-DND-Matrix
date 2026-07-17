import { useCallback } from 'react'
import type { GuidedCreationSendMessageResult, GuidedMessagePhase } from '../../../shared/guidedCreation/types'
import type { GuidedRefresh } from './guidedIdentityKickoff'
import { executeGuidedSend } from './executeGuidedSend'

export function useGuidedSendMessage(input: {
  campaignId: string
  characterId: string
  phase: GuidedMessagePhase
  inputValue: string
  sending: boolean
  setSending: (value: boolean) => void
  setError: (value: string | null) => void
  setInputValue: (value: string) => void
  setPendingPlayerMessage: (value: string | null) => void
  refresh: GuidedRefresh
  onStateChange?: () => void
}): () => Promise<GuidedCreationSendMessageResult | null> {
  return useCallback(async () => {
    const message = input.inputValue.trim()
    if (!message || input.sending) {
      return null
    }
    return executeGuidedSend({ ...input, message })
  }, [
    input.campaignId,
    input.characterId,
    input.inputValue,
    input.onStateChange,
    input.phase,
    input.refresh,
    input.sending,
    input.setError,
    input.setInputValue,
    input.setPendingPlayerMessage,
    input.setSending
  ])
}
