import type { GuidedCreationSendMessageResult, GuidedMessagePhase } from '../../../shared/guidedCreation/types'
import type { GuidedRefresh } from './guidedIdentityKickoff'
import { guidedSendErrorMessage, sendGuidedMessage } from './guidedSendMessage'

export async function executeGuidedSend(input: {
  campaignId: string
  characterId: string
  phase: GuidedMessagePhase
  message: string
  refresh: GuidedRefresh
  onStateChange?: () => void
  setSending: (value: boolean) => void
  setError: (value: string | null) => void
  setInputValue: (value: string) => void
  setPendingPlayerMessage: (value: string | null) => void
}): Promise<GuidedCreationSendMessageResult> {
  input.setSending(true)
  input.setError(null)
  input.setInputValue('')
  input.setPendingPlayerMessage(input.message)
  try {
    const result = await sendGuidedMessage({
      campaignId: input.campaignId,
      characterId: input.characterId,
      phase: input.phase,
      message: input.message,
      refresh: input.refresh,
      onStateChange: input.onStateChange
    })
    if (!result.ok) {
      input.setError(guidedSendErrorMessage(result.reason))
      input.setInputValue(input.message)
    }
    return result
  } catch (error) {
    input.setInputValue(input.message)
    throw error
  } finally {
    input.setPendingPlayerMessage(null)
    input.setSending(false)
  }
}
