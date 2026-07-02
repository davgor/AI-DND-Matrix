import { buildCharacterSetupController } from './buildCharacterSetupController'
import type { CharacterSetupController } from './characterSetupController'
import type { CharacterSetupDraft } from './characterSetupDraft'
import type { CharacterSetupState } from './characterSetupValidation'
import { useImageSelectors } from './useImageSelectors'
import { useSubmitCharacterSetup } from './useSubmitCharacterSetup'
import { useCharacterSetupFormState } from './useCharacterSetupFormState'

export type { CharacterSetupController } from './characterSetupController'

export function useCharacterSetup(
  campaignId: string,
  onComplete: () => void,
  draft?: CharacterSetupDraft | null
): CharacterSetupController {
  const form = useCharacterSetupFormState(draft)
  const images = useImageSelectors(draft?.portraitPath ?? null, draft?.sheetBackgroundPath ?? null)

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
    onComplete,
    resumeCharacterId: draft?.playerCharacterId ?? null
  })

  return buildCharacterSetupController(form, images, submission, draft)
}
