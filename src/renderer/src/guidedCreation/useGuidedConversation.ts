import { useEffect, useState } from 'react'
import type {
  GuidedCreationSendMessageResult,
  GuidedMessagePhase
} from '../../../shared/guidedCreation/types'
import { useGuidedIdentityKickoff } from './useGuidedIdentityKickoff'
import { useGuidedRefresh } from './useGuidedRefresh'
import { useGuidedSendMessage } from './useGuidedSendMessage'

export interface GuidedConversationController {
  state: ReturnType<typeof useGuidedRefresh>['state']
  loading: boolean
  kickingOff: boolean
  sending: boolean
  error: string | null
  inputValue: string
  pendingPlayerMessage: string | null
  setInputValue: (value: string) => void
  sendMessage: () => Promise<GuidedCreationSendMessageResult | null>
}

function useGuidedTurnFlags(): {
  kickingOff: boolean
  setKickingOff: (value: boolean) => void
  sending: boolean
  setSending: (value: boolean) => void
  error: string | null
  setError: (value: string | null) => void
  inputValue: string
  setInputValue: (value: string) => void
  pendingPlayerMessage: string | null
  setPendingPlayerMessage: (value: string | null) => void
} {
  const [kickingOff, setKickingOff] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [pendingPlayerMessage, setPendingPlayerMessage] = useState<string | null>(null)
  return {
    kickingOff,
    setKickingOff,
    sending,
    setSending,
    error,
    setError,
    inputValue,
    setInputValue,
    pendingPlayerMessage,
    setPendingPlayerMessage
  }
}

export function useGuidedConversation(
  campaignId: string,
  characterId: string,
  phase: GuidedMessagePhase,
  onStateChange?: () => void
): GuidedConversationController {
  const { state, loading, refresh } = useGuidedRefresh(characterId)
  const flags = useGuidedTurnFlags()

  useEffect(() => {
    void refresh()
  }, [refresh])

  useGuidedIdentityKickoff({
    campaignId,
    characterId,
    phase,
    loading,
    kickingOff: flags.kickingOff,
    sending: flags.sending,
    state,
    refresh,
    setKickingOff: flags.setKickingOff,
    setError: flags.setError,
    onStateChange
  })

  const sendMessage = useGuidedSendMessage({
    campaignId,
    characterId,
    phase,
    inputValue: flags.inputValue,
    sending: flags.sending,
    setSending: flags.setSending,
    setError: flags.setError,
    setInputValue: flags.setInputValue,
    setPendingPlayerMessage: flags.setPendingPlayerMessage,
    refresh,
    onStateChange
  })

  return {
    state,
    loading,
    kickingOff: flags.kickingOff,
    sending: flags.sending,
    error: flags.error,
    inputValue: flags.inputValue,
    pendingPlayerMessage: flags.pendingPlayerMessage,
    setInputValue: flags.setInputValue,
    sendMessage
  }
}
