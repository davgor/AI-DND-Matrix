import type {
  GuidedCreationFailureReason,
  GuidedCreationSendMessageResult,
  GuidedMessagePhase
} from '../../../shared/guidedCreation/types'
import type { GuidedRefresh } from './guidedIdentityKickoff'

export async function sendGuidedMessage(input: {
  campaignId: string
  characterId: string
  phase: GuidedMessagePhase
  message: string
  refresh: GuidedRefresh
  onStateChange?: () => void
}): Promise<GuidedCreationSendMessageResult> {
  const result = await window.guidedCreation.sendMessage({
    campaignId: input.campaignId,
    characterId: input.characterId,
    phase: input.phase,
    message: input.message
  })
  if (result.ok) {
    await input.refresh({ silent: true })
    input.onStateChange?.()
  }
  return result
}

export function guidedSendErrorMessage(reason: GuidedCreationFailureReason): string {
  return reason === 'schema_error' ? 'The DM could not respond. Try again.' : 'Unable to send message.'
}

export function guidedGenerateErrorMessage(reason: GuidedCreationFailureReason): string {
  if (reason === 'provider_error' || reason === 'schema_error') {
    return 'Unable to generate a reply. Try again.'
  }
  return 'Unable to generate a reply.'
}

