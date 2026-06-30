import type { GuidedCreationSendMessageResult, GuidedMessagePhase } from '../../../shared/guidedCreation/types'

export async function sendGuidedMessage(input: {
  campaignId: string
  characterId: string
  phase: GuidedMessagePhase
  message: string
  refresh: () => Promise<void>
  onStateChange?: () => void
}): Promise<GuidedCreationSendMessageResult> {
  const result = await window.guidedCreation.sendMessage({
    campaignId: input.campaignId,
    characterId: input.characterId,
    phase: input.phase,
    message: input.message
  })
  if (result.ok) {
    await input.refresh()
    input.onStateChange?.()
  }
  return result
}

export function guidedSendErrorMessage(reason: GuidedCreationSendMessageResult['reason']): string {
  return reason === 'schema_error' ? 'The DM could not respond. Try again.' : 'Unable to send message.'
}
