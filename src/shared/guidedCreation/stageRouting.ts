import type { Character } from '../../db/repositories/characters'
import type { GuidedCreationPhase } from './types'

export type OnboardingStage =
  | 'main'
  | 'review'
  | 'characterSetup'
  | 'guidedIdentity'
  | 'guidedOpeningScene'

export function findPlayerCharacter(characters: Character[]): Character | undefined {
  return characters.find((character) => character.kind === 'player')
}

export function canEnterPlay(player: Character | null | undefined): boolean {
  return Boolean(player && player.guidedCreationPhase === 'complete')
}

export function stageForGuidedPhase(phase: GuidedCreationPhase | undefined): OnboardingStage {
  if (phase === 'identity') {
    return 'guidedIdentity'
  }
  if (phase === 'opening_scene') {
    return 'guidedOpeningScene'
  }
  return 'main'
}

export function stageAfterCampaignSelect(characters: Character[]): OnboardingStage {
  const player = findPlayerCharacter(characters)
  if (!player) {
    return 'review'
  }
  return stageForGuidedPhase(player.guidedCreationPhase)
}
