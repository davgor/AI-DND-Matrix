import { useCallback, useEffect, useState } from 'react'
import type {
  GuidedCreationSendMessageResult,
  GuidedCreationState,
  GuidedMessagePhase
} from '../../../shared/guidedCreation/types'

async function invokeGuidedMessage(
  campaignId: string,
  characterId: string,
  phase: GuidedMessagePhase,
  message: string
): Promise<GuidedCreationSendMessageResult> {
  return window.guidedCreation.sendMessage({ campaignId, characterId, phase, message })
}

export interface GuidedConversationController {
  state: GuidedCreationState | null
  loading: boolean
  sending: boolean
  error: string | null
  inputValue: string
  setInputValue: (value: string) => void
  sendMessage: () => Promise<GuidedCreationSendMessageResult | null>
}

export function useGuidedConversation(
  campaignId: string,
  characterId: string,
  phase: GuidedMessagePhase,
  onStateChange?: () => void
): GuidedConversationController {
  const [state, setState] = useState<GuidedCreationState | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setState((await window.guidedCreation.getState(characterId)) ?? null)
    } finally {
      setLoading(false)
    }
  }, [characterId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function sendMessage(): Promise<GuidedCreationSendMessageResult | null> {
    if (!inputValue.trim() || sending) {
      return null
    }
    setSending(true)
    setError(null)
    try {
      const result = await invokeGuidedMessage(campaignId, characterId, phase, inputValue.trim())
      if (!result.ok) {
        setError(result.reason === 'schema_error' ? 'The DM could not respond. Try again.' : 'Unable to send message.')
        return result
      }
      setInputValue('')
      await refresh()
      onStateChange?.()
      return result
    } finally {
      setSending(false)
    }
  }

  return { state, loading, sending, error, inputValue, setInputValue, sendMessage }
}
