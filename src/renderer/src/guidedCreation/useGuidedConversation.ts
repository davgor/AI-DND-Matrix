import { useCallback, useEffect, useState } from 'react'
import type {
  GuidedCreationSendMessageResult,
  GuidedCreationState,
  GuidedMessagePhase
} from '../../../shared/guidedCreation/types'
import { useGuidedIdentityKickoff } from './useGuidedIdentityKickoff'
import { useGuidedSendMessage } from './useGuidedSendMessage'

export interface GuidedConversationController {
  state: GuidedCreationState | null
  loading: boolean
  kickingOff: boolean
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
  const [kickingOff, setKickingOff] = useState(false)
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

  useGuidedIdentityKickoff({
    campaignId,
    characterId,
    phase,
    loading,
    kickingOff,
    sending,
    state,
    refresh,
    setKickingOff,
    setError,
    onStateChange
  })

  const sendMessage = useGuidedSendMessage({
    campaignId,
    characterId,
    phase,
    inputValue,
    sending,
    setSending,
    setError,
    setInputValue,
    refresh,
    onStateChange
  })

  return { state, loading, kickingOff, sending, error, inputValue, setInputValue, sendMessage }
}
