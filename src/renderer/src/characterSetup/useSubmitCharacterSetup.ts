import { useState } from 'react'
import type { Alignment } from '../../../shared/alignment/types'
import type { AbilityScores } from '../../../engine/abilities'
import type { Archetype } from '../../../engine/hp'
import type { AbilityScoreMethod } from '../../../shared/characterSetup/abilityScoreMethod'
import { validateCharacterSetup, type CharacterSetupState } from './characterSetupValidation'
import { validatePartyMembers, type PartyMemberDraft } from './PartyMemberSetup'

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
  partyMembers: PartyMemberDraft[]
  onComplete: () => void
  resumeCharacterId: string | null
}

async function createCharacterSetup(
  campaignId: string,
  state: CharacterSetupState,
  extras: SubmissionExtras,
  partyMembers: PartyMemberDraft[]
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
  if (partyMembers.length > 0) {
    await window.characters.createPartyMembers({
      campaignId,
      members: partyMembers
    })
  }
}

async function updateCharacterSetup(input: {
  campaignId: string
  playerCharacterId: string
  state: CharacterSetupState
  extras: SubmissionExtras
  partyMembers: PartyMemberDraft[]
}): Promise<void> {
  await window.characters.updatePlayerSetup({
    characterId: input.playerCharacterId,
    name: input.state.name,
    archetype: input.state.archetype as Archetype,
    abilityScores: input.state.abilityScores as AbilityScores,
    abilityScoreMethod: input.extras.abilityScoreMethod,
    alignment: input.state.alignment as Alignment,
    portraitPath: input.extras.portraitPath,
    sheetBackgroundPath: input.extras.sheetBackgroundPath
  })
  await window.characters.replaceSetupPartyMembers({
    campaignId: input.campaignId,
    playerCharacterId: input.playerCharacterId,
    members: input.partyMembers
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
    const error = validateCharacterSetup(state) ?? validatePartyMembers(options.partyMembers)
    if (error) {
      setValidationError(error)
      return
    }
    setValidationError(null)
    setSubmitting(true)
    try {
      if (options.resumeCharacterId) {
        await updateCharacterSetup({
          campaignId,
          playerCharacterId: options.resumeCharacterId,
          state,
          extras: options.extras,
          partyMembers: options.partyMembers
        })
      } else {
        await createCharacterSetup(campaignId, state, options.extras, options.partyMembers)
      }
      options.onComplete()
    } finally {
      setSubmitting(false)
    }
  }

  return { validationError, submitting, handleSubmit }
}
