import type { GuidedMessagePhase } from '../../../shared/guidedCreation/types'

export async function kickoffGuidedPhase(input: {
  campaignId: string
  characterId: string
  phase: GuidedMessagePhase
  refresh: () => Promise<void>
  onStateChange?: () => void
}): Promise<{ ok: boolean; kickedOff: boolean }> {
  const kickoff =
    input.phase === 'identity'
      ? window.guidedCreation.kickoffIdentity({
          campaignId: input.campaignId,
          characterId: input.characterId
        })
      : window.guidedCreation.kickoffOpeningScene({
          campaignId: input.campaignId,
          characterId: input.characterId
        })
  const result = await kickoff
  if (result.ok && result.kickedOff) {
    await input.refresh()
    input.onStateChange?.()
  }
  return result
}

/** @deprecated Use kickoffGuidedPhase */
export const kickoffGuidedIdentity = kickoffGuidedPhase

export function shouldStartPhaseKickoff(input: {
  phase: GuidedMessagePhase
  loading: boolean
  kickingOff: boolean
  sending: boolean
  phaseMessageCount: number
  kickoffStarted: boolean
}): boolean {
  return (
    !input.loading &&
    !input.kickingOff &&
    !input.sending &&
    !input.kickoffStarted &&
    input.phaseMessageCount === 0
  )
}

/** @deprecated Use shouldStartPhaseKickoff */
export const shouldStartIdentityKickoff = shouldStartPhaseKickoff
