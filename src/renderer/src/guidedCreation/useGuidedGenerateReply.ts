import { useCallback } from 'react'
import type { GuidedMessagePhase } from '../../../shared/guidedCreation/types'
import { executeGuidedGenerateReply } from './executeGuidedGenerateReply'

export function useGuidedGenerateReply(input: {
  campaignId: string
  characterId: string
  phase: GuidedMessagePhase
  inputValue: string
  sending: boolean
  kickingOff: boolean
  generating: boolean
  setGenerating: (value: boolean) => void
  setError: (value: string | null) => void
  setInputValue: (value: string) => void
}): () => Promise<void> {
  return useCallback(async () => {
    if (input.sending || input.kickingOff) {
      return
    }
    await executeGuidedGenerateReply({
      campaignId: input.campaignId,
      characterId: input.characterId,
      phase: input.phase,
      existingDraft: input.inputValue,
      generating: input.generating,
      setGenerating: input.setGenerating,
      setError: input.setError,
      setInputValue: input.setInputValue
    })
  }, [
    input.campaignId,
    input.characterId,
    input.generating,
    input.inputValue,
    input.kickingOff,
    input.phase,
    input.sending,
    input.setError,
    input.setGenerating,
    input.setInputValue
  ])
}
