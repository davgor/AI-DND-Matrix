import type { AbilityScores } from '../../../engine/abilities'
import type { Archetype } from '../../../engine/hp'
import type { Alignment } from '../../../shared/alignment/types'
import type { AbilityScoreMethod } from '../../../shared/characterSetup/abilityScoreMethod'
import type { CharacterSetupFormDefaults } from './characterSetupDraft'

export interface CharacterSetupSessionDraft extends CharacterSetupFormDefaults {
  playerCharacterId?: string
  portraitPath?: string | null
  sheetBackgroundPath?: string | null
}

const DRAFT_PREFIX = 'onboarding-character-setup-draft:'

function draftKey(campaignId: string): string {
  return `${DRAFT_PREFIX}${campaignId}`
}

export function readCharacterSetupSessionDraft(campaignId: string): CharacterSetupSessionDraft | null {
  try {
    const raw = sessionStorage.getItem(draftKey(campaignId))
    if (!raw) {
      return null
    }
    return JSON.parse(raw) as CharacterSetupSessionDraft
  } catch {
    return null
  }
}

export function writeCharacterSetupSessionDraft(
  campaignId: string,
  draft: CharacterSetupSessionDraft
): void {
  try {
    sessionStorage.setItem(draftKey(campaignId), JSON.stringify(draft))
  } catch {
    // Ignore quota or privacy-mode failures.
  }
}

export function clearCharacterSetupSessionDraft(campaignId: string): void {
  try {
    sessionStorage.removeItem(draftKey(campaignId))
  } catch {
    // Ignore.
  }
}

export function resolveCharacterSetupFormDefaults(
  dbDraft: CharacterSetupFormDefaults | null | undefined,
  sessionDraft: CharacterSetupSessionDraft | null
): CharacterSetupFormDefaults {
  if (dbDraft) {
    return dbDraft
  }
  if (sessionDraft) {
    return {
      name: sessionDraft.name,
      archetype: sessionDraft.archetype,
      alignment: sessionDraft.alignment,
      abilityScores: sessionDraft.abilityScores,
      abilityScoreMethod: sessionDraft.abilityScoreMethod
    }
  }
  return {
    name: '',
    archetype: '',
    alignment: '',
    abilityScores: null,
    abilityScoreMethod: 'pointBuy'
  }
}

export function sessionDraftFromFormState(input: {
  campaignId: string
  playerCharacterId?: string | null
  name: string
  archetype: Archetype | ''
  alignment: Alignment | ''
  abilityScores: AbilityScores | null
  abilityScoreMethod: AbilityScoreMethod
  portraitPath: string | null
  sheetBackgroundPath: string | null
}): CharacterSetupSessionDraft {
  return {
    playerCharacterId: input.playerCharacterId ?? undefined,
    name: input.name,
    archetype: input.archetype,
    alignment: input.alignment,
    abilityScores: input.abilityScores,
    abilityScoreMethod: input.abilityScoreMethod,
    portraitPath: input.portraitPath,
    sheetBackgroundPath: input.sheetBackgroundPath
  }
}
