import { useEffect, useRef } from 'react'
import type { GuidedCreationState, GuidedMessagePhase } from '../../../shared/guidedCreation/types'
import { runIdentityKickoffEffect } from './runIdentityKickoffEffect'

export function useGuidedIdentityKickoff(input: {
  campaignId: string
  characterId: string
  phase: GuidedMessagePhase
  loading: boolean
  kickingOff: boolean
  sending: boolean
  state: GuidedCreationState | null
  refresh: () => Promise<void>
  setKickingOff: (value: boolean) => void
  setError: (value: string | null) => void
  onStateChange?: () => void
}): void {
  const kickoffStartedRef = useRef(false)

  useEffect(
    () =>
      runIdentityKickoffEffect({
        ...input,
        kickoffStartedRef
      }),
    [
      input.campaignId,
      input.characterId,
      input.onStateChange,
      input.phase,
      input.refresh,
      input.setError,
      input.setKickingOff,
      input.state?.messages
    ]
  )
}
