import { useState } from 'react'
import type { Alignment } from '../../../shared/alignment/types'
import type { AbilityScores } from '../../../engine/abilities'
import type { AiPartyMemberInput } from '../../../main/characterCreationIpc'
import { validateCharacterSetup, type CharacterSetupState } from './characterSetupValidation'

export interface SubmissionExtras {
  partyMembers: AiPartyMemberInput[]
  portraitPath: string | null
  sheetBackgroundPath: string | null
}

export interface SubmitController {
  validationError: string | null
  submitting: boolean
  handleSubmit: () => Promise<void>
}

async function submitCharacterSetup(
  campaignId: string,
  state: CharacterSetupState,
  extras: SubmissionExtras
): Promise<void> {
  await window.characters.createPlayer({
    campaignId,
    name: state.name,
    archetype: state.archetype as Archetype,
    abilityScores: state.abilityScores as AbilityScores,
    alignment: state.alignment as Alignment,
    portraitPath: extras.portraitPath,
    sheetBackgroundPath: extras.sheetBackgroundPath
  })
  await window.characters.createPartyMembers({ campaignId, members: extras.partyMembers })
}

export function useSubmitCharacterSetup(
  campaignId: string,
  state: CharacterSetupState,
  extras: SubmissionExtras,
  onComplete: () => void
): SubmitController {
  const [validationError, setValidationError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(): Promise<void> {
    const error = validateCharacterSetup(state)
    if (error) {
      setValidationError(error)
      return
    }
    setValidationError(null)
    setSubmitting(true)
    try {
      await submitCharacterSetup(campaignId, state, extras)
      onComplete()
    } finally {
      setSubmitting(false)
    }
  }

  return { validationError, submitting, handleSubmit }
}
