import { useState } from 'react'
import type { Alignment } from '../../../shared/alignment/types'
import type { AbilityScores } from '../../../engine/abilities'
import type { Archetype } from '../../../engine/hp'
import type { AbilityScoreMethod } from '../../../shared/characterSetup/abilityScoreMethod'
import { validateCharacterSetup, type CharacterSetupState } from './characterSetupValidation'

export interface SubmissionExtras {
  portraitPath: string | null
  sheetBackgroundPath: string | null
  abilityScoreMethod: AbilityScoreMethod
}

export interface SubmitController {
  validationError: string | null
  submitting: boolean
  handleSubmit: () => Promise<void>
}

export interface SubmitCharacterSetupOptions {
  extras: SubmissionExtras
  onComplete: () => void
  resumeCharacterId: string | null
}

async function createCharacterSetup(
  campaignId: string,
  state: CharacterSetupState,
  extras: SubmissionExtras
): Promise<void> {
  await window.characters.createPlayer({
    campaignId,
    name: state.name,
    archetype: state.archetype as Archetype,
    abilityScores: state.abilityScores as AbilityScores,
    abilityScoreMethod: extras.abilityScoreMethod,
    alignment: state.alignment as Alignment,
    portraitPath: extras.portraitPath,
    sheetBackgroundPath: extras.sheetBackgroundPath
  })
}

async function updateCharacterSetup(
  playerCharacterId: string,
  state: CharacterSetupState,
  extras: SubmissionExtras
): Promise<void> {
  await window.characters.updatePlayerSetup({
    characterId: playerCharacterId,
    name: state.name,
    archetype: state.archetype as Archetype,
    abilityScores: state.abilityScores as AbilityScores,
    abilityScoreMethod: extras.abilityScoreMethod,
    alignment: state.alignment as Alignment,
    portraitPath: extras.portraitPath,
    sheetBackgroundPath: extras.sheetBackgroundPath
  })
}

export function useSubmitCharacterSetup(
  campaignId: string,
  state: CharacterSetupState,
  options: SubmitCharacterSetupOptions
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
      if (options.resumeCharacterId) {
        await updateCharacterSetup(options.resumeCharacterId, state, options.extras)
      } else {
        await createCharacterSetup(campaignId, state, options.extras)
      }
      options.onComplete()
    } finally {
      setSubmitting(false)
    }
  }

  return { validationError, submitting, handleSubmit }
}
