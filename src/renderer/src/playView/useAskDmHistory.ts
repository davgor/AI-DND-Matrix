import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import type { AskDmMessage } from '../../../shared/askDm/types'

function readAskDmApi(): Window['askDm'] | undefined {
  return window.askDm
}

export function useAskDmHistory(input: {
  campaignId: string
  characterId: string
  isOpen: boolean
}): {
  messages: AskDmMessage[]
  loading: boolean
  error: string | null
  setMessages: Dispatch<SetStateAction<AskDmMessage[]>>
  setError: Dispatch<SetStateAction<string | null>>
} {
  const [messages, setMessages] = useState<AskDmMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!input.isOpen) {
      return
    }
    const api = readAskDmApi()
    if (!api) {
      setError('Ask the DM is not available yet.')
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    void api
      .listHistory({ campaignId: input.campaignId, characterId: input.characterId })
      .then((history) => {
        if (!cancelled) {
          setMessages(history)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Could not load OOC history.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [input.isOpen, input.campaignId, input.characterId])

  return { messages, loading, error, setMessages, setError }
}
