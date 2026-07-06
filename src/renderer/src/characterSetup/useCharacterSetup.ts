import { buildCharacterSetupController } from './buildCharacterSetupController'
import type { CharacterSetupController } from './characterSetupController'
import type { CharacterSetupDraft } from './characterSetupDraft'
import type { CharacterSetupState } from './characterSetupValidation'
import { useImageSelectors } from './useImageSelectors'
import { useSubmitCharacterSetup } from './useSubmitCharacterSetup'
import { useCharacterSetupFormState } from './useCharacterSetupFormState'
import { clearCharacterSetupSessionDraft, readCharacterSetupSessionDraft } from './characterSetupSessionDraft'
import { useCharacterSetupSessionPersistence } from './useCharacterSetupSessionPersistence'
import { useState } from 'react'
import type { PartyMemberDraft } from './PartyMemberSetup'

export type { CharacterSetupController } from './characterSetupController'

function initialImagePaths(
  draft: CharacterSetupDraft | null | undefined,
  sessionDraft: ReturnType<typeof readCharacterSetupSessionDraft>
): { portraitPath: string | null; sheetBackgroundPath: string | null } {
  return {
    portraitPath: draft?.portraitPath ?? sessionDraft?.portraitPath ?? null,
    sheetBackgroundPath: draft?.sheetBackgroundPath ?? sessionDraft?.sheetBackgroundPath ?? null
  }
}

export function useCharacterSetup(
  campaignId: string,
  onComplete: () => void,
  draft?: CharacterSetupDraft | null
): CharacterSetupController & {
  partyMembers: PartyMemberDraft[]
  setPartyMembers: (members: PartyMemberDraft[]) => void
} {
  const form = useCharacterSetupFormState(campaignId, draft)
  const sessionDraft = readCharacterSetupSessionDraft(campaignId)
  const imagePaths = initialImagePaths(draft, sessionDraft)
  const images = useImageSelectors(imagePaths.portraitPath, imagePaths.sheetBackgroundPath)
  const [partyMembers, setPartyMembers] = useState<PartyMemberDraft[]>([])
  useCharacterSetupSessionPersistence(campaignId, draft, form, images)

  const formState: CharacterSetupState = {
    name: form.name,
    archetype: form.archetype,
    alignment: form.alignment,
    abilityScores: form.abilityScores,
    abilityScoreMethod: form.abilityScoreMethod
  }
  const submission = useSubmitCharacterSetup(campaignId, formState, {
    extras: {
      portraitPath: images.portraitPath,
      sheetBackgroundPath: images.sheetBackgroundPath,
      abilityScoreMethod: form.abilityScoreMethod
    },
    partyMembers,
    onComplete: () => {
      clearCharacterSetupSessionDraft(campaignId)
      onComplete()
    },
    resumeCharacterId: draft?.playerCharacterId ?? null
  })

  return {
    ...buildCharacterSetupController(form, images, submission, draft),
    partyMembers,
    setPartyMembers
  }
}
