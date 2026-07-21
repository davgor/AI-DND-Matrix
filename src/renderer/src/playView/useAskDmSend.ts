import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'
import type { AskDmMessage } from '../../../shared/askDm/types'

function readAskDmApi(): Window['askDm'] | undefined {
  return window.askDm
}

function sendFailureMessage(reason: string): string {
  if (reason === 'empty_message') {
    return 'Enter a message before sending.'
  }
  if (reason === 'agent_failed') {
    return 'Could not reach the DM.'
  }
  return 'Could not send your message.'
}

export function useAskDmSend(input: {
  campaignId: string
  characterId: string
  messages: AskDmMessage[]
  setMessages: Dispatch<SetStateAction<AskDmMessage[]>>
  setError: Dispatch<SetStateAction<string | null>>
}): {
  sending: boolean
  inputValue: string
  setInputValue: (value: string) => void
  sendMessage: () => Promise<void>
} {
  const [sending, setSending] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const sendMessage = useCallback(async () => {
    const trimmed = inputValue.trim()
    if (!trimmed || sending) {
      return
    }
    const api = readAskDmApi()
    if (!api) {
      input.setError('Ask the DM is not available yet.')
      return
    }
    setSending(true)
    input.setError(null)
    try {
      const result = await api.sendMessage({
        campaignId: input.campaignId,
        characterId: input.characterId,
        message: trimmed
      })
      if (!result.ok) {
        input.setError(sendFailureMessage(result.reason))
        const persistedPlayer = result.playerMessage
        if (persistedPlayer) {
          input.setMessages((current) => [...current, persistedPlayer])
        }
        return
      }
      input.setMessages((current) => [...current, result.playerMessage, result.dmMessage])
      setInputValue('')
    } catch {
      input.setError('Could not reach the DM.')
    } finally {
      setSending(false)
    }
  }, [input, inputValue, sending])

  return { sending, inputValue, setInputValue, sendMessage }
}
