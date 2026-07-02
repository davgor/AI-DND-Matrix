import type { Character } from '../../db/repositories/characters'
import type { GuidedCreationPhase } from './types'
import { isHubEligible } from '../campaignHub/types'

export type OnboardingStage =
  | 'main'
  | 'review'
  | 'characterSetup'
  | 'equipmentSelection'
  | 'guidedIdentity'
  | 'guidedOpeningScene'
  | 'campaignHub'

export function findPlayerCharacter(characters: Character[]): Character | undefined {
  return characters.find((character) => character.kind === 'player')
}

export function findIncompletePlayerCharacter(characters: Character[]): Character | undefined {
  return characters.find(
    (character) =>
      character.kind === 'player' &&
      character.guidedCreationPhase !== 'complete' &&
      character.guidedCreationPhase !== 'none'
  )
}

export function findEquipmentPhasePlayer(characters: Character[]): Character | undefined {
  return characters.find(
    (character) => character.kind === 'player' && character.guidedCreationPhase === 'equipment'
  )
}

export function findGuidedCreationPlayer(characters: Character[]): Character | undefined {
  return (
    findEquipmentPhasePlayer(characters) ??
    findIncompletePlayerCharacter(characters) ??
    findPlayerCharacter(characters)
  )
}

export function listPlayerCharacters(characters: Character[]): Character[] {
  return characters.filter((character) => character.kind === 'player')
}

export function canEnterPlay(player: Character | null | undefined): boolean {
  return Boolean(player && player.guidedCreationPhase === 'complete')
}

export function stageForGuidedPhase(phase: GuidedCreationPhase | undefined): OnboardingStage {
  if (phase === 'equipment') {
    return 'equipmentSelection'
  }
  if (phase === 'identity') {
    return 'guidedIdentity'
  }
  if (phase === 'opening_scene') {
    return 'guidedOpeningScene'
  }
  return 'main'
}

export function stageAfterCampaignSelect(characters: Character[]): OnboardingStage {
  if (!findPlayerCharacter(characters)) {
    return 'review'
  }
  if (isHubEligible(characters)) {
    return 'campaignHub'
  }
  const player = findGuidedCreationPlayer(characters)
  if (!player) {
    return 'main'
  }
  return stageForGuidedPhase(player.guidedCreationPhase)
}
