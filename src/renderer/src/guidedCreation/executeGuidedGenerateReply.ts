import type {
  GuidedCreationGenerateReplyResult,
  GuidedMessagePhase
} from '../../../shared/guidedCreation/types'
import { guidedGenerateErrorMessage } from './guidedSendMessage'

export async function executeGuidedGenerateReply(input: {
  campaignId: string
  characterId: string
  phase: GuidedMessagePhase
  existingDraft: string
  generating: boolean
  setGenerating: (value: boolean) => void
  setError: (value: string | null) => void
  setInputValue: (value: string) => void
}): Promise<GuidedCreationGenerateReplyResult | null> {
  if (input.generating || !window.guidedCreation?.generateReply) {
    return null
  }

  input.setGenerating(true)
  input.setError(null)
  try {
    const result = await window.guidedCreation.generateReply({
      campaignId: input.campaignId,
      characterId: input.characterId,
      phase: input.phase,
      existingDraft: input.existingDraft.trim() || null
    })
    if (!result.ok) {
      input.setError(guidedGenerateErrorMessage(result.reason))
      return result
    }
    input.setInputValue(result.reply)
    return result
  } finally {
    input.setGenerating(false)
  }
}
