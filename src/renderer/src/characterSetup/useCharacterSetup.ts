import { buildCharacterSetupController } from './buildCharacterSetupController'
import type { CharacterSetupController } from './characterSetupController'
import type { CharacterSetupDraft } from './characterSetupDraft'
import type { CharacterSetupState } from './characterSetupValidation'
import { useImageSelectors } from './useImageSelectors'
import { useCharacterSetupPortrait } from './useCharacterSetupPortrait'
import { useSubmitCharacterSetup } from './useSubmitCharacterSetup'
import { useCharacterSetupFormState } from './useCharacterSetupFormState'
import { clearCharacterSetupSessionDraft, readCharacterSetupSessionDraft } from './characterSetupSessionDraft'
import { useCharacterSetupSessionPersistence } from './useCharacterSetupSessionPersistence'
import { useState } from 'react'
import type { PartyMemberDraft } from './PartyMemberSetup'
import type { CharacterSetupPortraitState } from './useCharacterSetupPortrait'

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

function buildFormState(form: ReturnType<typeof useCharacterSetupFormState>): CharacterSetupState {
  return {
    name: form.name,
    archetype: form.archetype,
    alignment: form.alignment,
    abilityScores: form.abilityScores,
    abilityScoreMethod: form.abilityScoreMethod
  }
}

export function useCharacterSetup(
  campaignId: string,
  onComplete: () => void,
  draft?: CharacterSetupDraft | null
): CharacterSetupController & {
  partyMembers: PartyMemberDraft[]
  setPartyMembers: (members: PartyMemberDraft[]) => void
  portrait: CharacterSetupPortraitState
} {
  const form = useCharacterSetupFormState(campaignId, draft)
  const sessionDraft = readCharacterSetupSessionDraft(campaignId)
  const imagePaths = initialImagePaths(draft, sessionDraft)
  const portrait = useCharacterSetupPortrait({
    campaignId,
    name: form.name,
    role: form.archetype || 'adventurer',
    initialPortraitPath: imagePaths.portraitPath
  })
  const images = useImageSelectors(portrait.portraitPath, imagePaths.sheetBackgroundPath)
  const [partyMembers, setPartyMembers] = useState<PartyMemberDraft[]>([])
  useCharacterSetupSessionPersistence(campaignId, draft, form, {
    ...images,
    portraitPath: portrait.portraitPath
  })
  const submission = useSubmitCharacterSetup(campaignId, buildFormState(form), {
    extras: {
      portraitPath: portrait.portraitPath,
      portraitPrompt: portrait.portraitPrompt.trim() ? portrait.portraitPrompt.trim() : null,
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
    setPartyMembers,
    portrait
  }
}
