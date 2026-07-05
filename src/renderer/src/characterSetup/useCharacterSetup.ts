import { buildCharacterSetupController } from './buildCharacterSetupController'
import type { CharacterSetupController } from './characterSetupController'
import type { CharacterSetupDraft } from './characterSetupDraft'
import type { CharacterSetupState } from './characterSetupValidation'
import { useImageSelectors } from './useImageSelectors'
import { useSubmitCharacterSetup } from './useSubmitCharacterSetup'
import { useCharacterSetupFormState } from './useCharacterSetupFormState'
import { useState } from 'react'
import type { PartyMemberDraft } from './PartyMemberSetup'

export type { CharacterSetupController } from './characterSetupController'

export function useCharacterSetup(
  campaignId: string,
  onComplete: () => void,
  draft?: CharacterSetupDraft | null
): CharacterSetupController & {
  partyMembers: PartyMemberDraft[]
  setPartyMembers: (members: PartyMemberDraft[]) => void
} {
  const form = useCharacterSetupFormState(draft)
  const images = useImageSelectors(draft?.portraitPath ?? null, draft?.sheetBackgroundPath ?? null)
  const [partyMembers, setPartyMembers] = useState<PartyMemberDraft[]>([])

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
    onComplete,
    resumeCharacterId: draft?.playerCharacterId ?? null
  })

  return {
    ...buildCharacterSetupController(form, images, submission, draft),
    partyMembers,
    setPartyMembers
  }
}
