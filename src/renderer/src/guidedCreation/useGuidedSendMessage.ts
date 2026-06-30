import { useCallback } from 'react'
import type { GuidedCreationSendMessageResult, GuidedMessagePhase } from '../../../shared/guidedCreation/types'
import { guidedSendErrorMessage, sendGuidedMessage } from './guidedSendMessage'

export function useGuidedSendMessage(input: {
  campaignId: string
  characterId: string
  phase: GuidedMessagePhase
  inputValue: string
  sending: boolean
  setSending: (value: boolean) => void
  setError: (value: string | null) => void
  setInputValue: (value: string) => void
  refresh: () => Promise<void>
  onStateChange?: () => void
}): () => Promise<GuidedCreationSendMessageResult | null> {
  return useCallback(async () => {
    const message = input.inputValue.trim()
    if (!message || input.sending) {
      return null
    }
    input.setSending(true)
    input.setError(null)
    try {
      const result = await sendGuidedMessage({
        campaignId: input.campaignId,
        characterId: input.characterId,
        phase: input.phase,
        message,
        refresh: input.refresh,
        onStateChange: input.onStateChange
      })
      if (!result.ok) {
        input.setError(guidedSendErrorMessage(result.reason))
        return result
      }
      input.setInputValue('')
      return result
    } finally {
      input.setSending(false)
    }
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
    input.setSending
  ])
}
