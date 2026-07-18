import { useEffect, useState } from 'react'
import type {
  GuidedCreationSendMessageResult,
  GuidedMessagePhase
} from '../../../shared/guidedCreation/types'
import { useGuidedConversationActions } from './useGuidedConversationActions'
import { useGuidedRefresh } from './useGuidedRefresh'

export interface GuidedConversationController {
  state: ReturnType<typeof useGuidedRefresh>['state']
  loading: boolean
  kickingOff: boolean
  sending: boolean
  generating: boolean
  error: string | null
  inputValue: string
  pendingPlayerMessage: string | null
  setInputValue: (value: string) => void
  sendMessage: () => Promise<GuidedCreationSendMessageResult | null>
  generateReply: () => Promise<void>
}

function useGuidedTurnFlags(): {
  kickingOff: boolean
  setKickingOff: (value: boolean) => void
  sending: boolean
  setSending: (value: boolean) => void
  generating: boolean
  setGenerating: (value: boolean) => void
  error: string | null
  setError: (value: string | null) => void
  inputValue: string
  setInputValue: (value: string) => void
  pendingPlayerMessage: string | null
  setPendingPlayerMessage: (value: string | null) => void
} {
  const [kickingOff, setKickingOff] = useState(false)
  const [sending, setSending] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [pendingPlayerMessage, setPendingPlayerMessage] = useState<string | null>(null)
  return {
    kickingOff,
    setKickingOff,
    sending,
    setSending,
    generating,
    setGenerating,
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

  const actions = useGuidedConversationActions({
    campaignId,
    characterId,
    phase,
    loading,
    state,
    refresh,
    ...flags,
    onStateChange
  })

  return {
    state,
    loading,
    kickingOff: flags.kickingOff,
    sending: flags.sending,
    generating: flags.generating,
    error: flags.error,
    inputValue: flags.inputValue,
    pendingPlayerMessage: flags.pendingPlayerMessage,
    setInputValue: flags.setInputValue,
    ...actions
  }
}
