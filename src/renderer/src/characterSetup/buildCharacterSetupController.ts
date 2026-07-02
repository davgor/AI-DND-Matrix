import type { CharacterSetupDraft } from './characterSetupDraft'
import type { CharacterSetupController } from './characterSetupController'
import type { CharacterSetupFormState } from './useCharacterSetupFormState'
import type { SubmitController } from './useSubmitCharacterSetup'

interface ImageSelectors {
  selectPortrait: () => Promise<void>
  selectSheetBackground: () => Promise<void>
}

export function buildCharacterSetupController(
  form: CharacterSetupFormState,
  images: ImageSelectors,
  submission: SubmitController,
  draft?: CharacterSetupDraft | null
): CharacterSetupController {
  return {
    name: form.name,
    setName: form.setName,
    archetype: form.archetype,
    setArchetype: form.setArchetype,
    alignment: form.alignment,
    setAlignment: form.setAlignment,
    setAbilityScores: form.setAbilityScores,
    setAbilityScoreMethod: form.setAbilityScoreMethod,
    selectPortrait: images.selectPortrait,
    selectSheetBackground: images.selectSheetBackground,
    resumeCharacterId: draft?.playerCharacterId ?? null,
    initialAbilityScores: draft?.abilityScores ?? null,
    initialAbilityScoreMethod: form.abilityScoreMethod,
    ...submission
  }
}
