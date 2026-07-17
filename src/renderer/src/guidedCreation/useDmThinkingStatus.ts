import { useEffect, useState } from 'react'
import { dmThinkingStatusLabel } from './guidedConversationState'

const FRAME_MS = 400

/** Animated “The DM is thinking.” / .. / ... / .... while `active`. */
export function useDmThinkingStatus(active: boolean): string | null {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (!active) {
      setFrame(0)
      return
    }
    const id = window.setInterval(() => {
      setFrame((current) => current + 1)
    }, FRAME_MS)
    return () => window.clearInterval(id)
  }, [active])

  return active ? dmThinkingStatusLabel(frame) : null
}
