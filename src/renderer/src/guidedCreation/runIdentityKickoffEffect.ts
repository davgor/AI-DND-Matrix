import type { GuidedCreationState, GuidedMessagePhase } from '../../../shared/guidedCreation/types'
import { kickoffGuidedIdentity, shouldStartIdentityKickoff } from './guidedIdentityKickoff'

function startIdentityKickoff(input: {
  campaignId: string
  characterId: string
  kickoffStartedRef: { current: boolean }
  refresh: () => Promise<void>
  setKickingOff: (value: boolean) => void
  setError: (value: string | null) => void
  onStateChange?: () => void
}): () => void {
  let cancelled = false
  input.kickoffStartedRef.current = true
  input.setKickingOff(true)
  input.setError(null)
  void kickoffGuidedIdentity({
    campaignId: input.campaignId,
    characterId: input.characterId,
    refresh: input.refresh,
    onStateChange: input.onStateChange
  })
    .then((result) => {
      if (cancelled || result.ok) {
        return
      }
      input.kickoffStartedRef.current = false
      input.setError('The DM could not start the interview. Try reloading.')
    })
    .finally(() => {
      if (!cancelled) {
        input.setKickingOff(false)
      }
    })
  return () => {
    cancelled = true
  }
}

export function runIdentityKickoffEffect(input: {
  campaignId: string
  characterId: string
  phase: GuidedMessagePhase
  loading: boolean
  kickingOff: boolean
  sending: boolean
  state: GuidedCreationState | null
  kickoffStartedRef: { current: boolean }
  refresh: () => Promise<void>
  setKickingOff: (value: boolean) => void
  setError: (value: string | null) => void
  onStateChange?: () => void
}): (() => void) | void {
  const identityMessageCount =
    input.state?.messages.filter((message) => message.phase === 'identity').length ?? 0
  if (
    !shouldStartIdentityKickoff({
      phase: input.phase,
      loading: input.loading,
      kickingOff: input.kickingOff,
      sending: input.sending,
      identityMessageCount,
      kickoffStarted: input.kickoffStartedRef.current
    })
  ) {
    return
  }
  return startIdentityKickoff(input)
}
