import { useEffect } from 'react'
import type { CharacterSetupDraft } from './characterSetupDraft'
import type { CharacterSetupFormState } from './useCharacterSetupFormState'
import type { useImageSelectors } from './useImageSelectors'
import { sessionDraftFromFormState, writeCharacterSetupSessionDraft } from './characterSetupSessionDraft'

export function useCharacterSetupSessionPersistence(
  campaignId: string,
  draft: CharacterSetupDraft | null | undefined,
  form: CharacterSetupFormState,
  images: ReturnType<typeof useImageSelectors>
): void {
  useEffect(() => {
    writeCharacterSetupSessionDraft(
      campaignId,
      sessionDraftFromFormState({
        campaignId,
        playerCharacterId: draft?.playerCharacterId,
        name: form.name,
        archetype: form.archetype,
        alignment: form.alignment,
        abilityScores: form.abilityScores,
        abilityScoreMethod: form.abilityScoreMethod,
        portraitPath: images.portraitPath,
        sheetBackgroundPath: images.sheetBackgroundPath
      })
    )
  }, [
    campaignId,
    draft?.playerCharacterId,
    form.abilityScoreMethod,
    form.abilityScores,
    form.alignment,
    form.archetype,
    form.name,
    images.portraitPath,
    images.sheetBackgroundPath
  ])
}
