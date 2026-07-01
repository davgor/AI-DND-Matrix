import type { GuidedCreationState, GuidedMessagePhase } from '../../../shared/guidedCreation/types'
import { kickoffGuidedPhase, shouldStartPhaseKickoff } from './guidedIdentityKickoff'

function startPhaseKickoff(input: {
  campaignId: string
  characterId: string
  phase: GuidedMessagePhase
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
  void kickoffGuidedPhase({
    campaignId: input.campaignId,
    characterId: input.characterId,
    phase: input.phase,
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
      // Always clear — effect re-runs (e.g. after refresh updates messages) call cleanup
      // and must not leave kickingOff stuck true once the kickoff promise settles.
      input.setKickingOff(false)
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
  const phaseMessageCount =
    input.state?.messages.filter((message) => message.phase === input.phase).length ?? 0
  if (
    !shouldStartPhaseKickoff({
      phase: input.phase,
      loading: input.loading,
      kickingOff: input.kickingOff,
      sending: input.sending,
      phaseMessageCount,
      kickoffStarted: input.kickoffStartedRef.current
    })
  ) {
    return
  }
  return startPhaseKickoff(input)
}
