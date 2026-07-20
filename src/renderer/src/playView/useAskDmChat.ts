import { useAskDmHistory } from './useAskDmHistory'
import { useAskDmSend } from './useAskDmSend'
import type { AskDmMessage } from '../../../shared/askDm/types'

export function useAskDmChat(input: {
  campaignId: string
  characterId: string
  isOpen: boolean
}): {
  messages: AskDmMessage[]
  loading: boolean
  sending: boolean
  error: string | null
  inputValue: string
  setInputValue: (value: string) => void
  sendMessage: () => Promise<void>
} {
  const history = useAskDmHistory(input)
  const composer = useAskDmSend({
    campaignId: input.campaignId,
    characterId: input.characterId,
    messages: history.messages,
    setMessages: history.setMessages,
    setError: history.setError
  })

  return {
    messages: history.messages,
    loading: history.loading,
    sending: composer.sending,
    error: history.error,
    inputValue: composer.inputValue,
    setInputValue: composer.setInputValue,
    sendMessage: composer.sendMessage
  }
}
