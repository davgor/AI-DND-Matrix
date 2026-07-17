import type { GuidedMessagePhase } from '../../../shared/guidedCreation/types'

export type GuidedRefresh = (options?: { silent?: boolean }) => Promise<void>

export async function kickoffGuidedIdentity(input: {
  campaignId: string
  characterId: string
  refresh: GuidedRefresh
  onStateChange?: () => void
}): Promise<{ ok: boolean; kickedOff: boolean }> {
  const result = await window.guidedCreation.kickoffIdentity({
    campaignId: input.campaignId,
    characterId: input.characterId
  })
  if (result.ok && result.kickedOff) {
    await input.refresh({ silent: true })
    input.onStateChange?.()
  }
  return result
}

export function shouldStartIdentityKickoff(input: {
  phase: GuidedMessagePhase
  loading: boolean
  kickingOff: boolean
  sending: boolean
  identityMessageCount: number
  kickoffStarted: boolean
}): boolean {
  return (
    !input.loading &&
    !input.kickingOff &&
    !input.sending &&
    input.phase === 'identity' &&
    !input.kickoffStarted &&
    input.identityMessageCount === 0
  )
}
