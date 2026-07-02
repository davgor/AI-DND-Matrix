import type { Character } from '../../../db/repositories/characters'
import type { AbilityScores } from '../../../engine/abilities'
import type { Archetype } from '../../../engine/hp'
import type { Alignment } from '../../../shared/alignment/types'
import type { AbilityScoreMethod } from '../../../shared/characterSetup/abilityScoreMethod'
import { resolveAbilityScoreMethod } from '../../../shared/characterSetup/abilityScoreMethod'
import { findEquipmentPhasePlayer } from '../../../shared/guidedCreation/stageRouting'

export interface CharacterSetupDraft {
  playerCharacterId: string
  name: string
  archetype: Archetype
  alignment: Alignment
  abilityScores: AbilityScores
  abilityScoreMethod: AbilityScoreMethod
  portraitPath: string | null
  sheetBackgroundPath: string | null
}

export function extractAbilityScores(stats: Record<string, unknown>): AbilityScores | null {
  const scores = stats.abilityScores
  if (!scores || typeof scores !== 'object') {
    return null
  }
  const candidate = scores as AbilityScores
  if (
    typeof candidate.body === 'number' &&
    typeof candidate.agility === 'number' &&
    typeof candidate.mind === 'number' &&
    typeof candidate.presence === 'number'
  ) {
    return candidate
  }
  return null
}

export function buildCharacterSetupDraft(
  player: Character,
  _characters: Character[]
): CharacterSetupDraft | null {
  if (player.guidedCreationPhase !== 'equipment' || !player.alignment) {
    return null
  }
  const abilityScores = extractAbilityScores(player.stats)
  if (!abilityScores) {
    return null
  }

  return {
    playerCharacterId: player.id,
    name: player.name,
    archetype: player.characterClass as Archetype,
    alignment: player.alignment,
    abilityScores,
    abilityScoreMethod: resolveAbilityScoreMethod(player.stats, abilityScores),
    portraitPath: player.portraitPath,
    sheetBackgroundPath: player.sheetBackgroundPath
  }
}

export function resolveCharacterSetupDraft(characters: Character[]): CharacterSetupDraft | null {
  const player = findEquipmentPhasePlayer(characters)
  if (!player) {
    return null
  }
  return buildCharacterSetupDraft(player, characters)
}

export interface CharacterSetupFormDefaults {
  name: string
  archetype: Archetype | ''
  alignment: Alignment | ''
  abilityScores: AbilityScores | null
  abilityScoreMethod: AbilityScoreMethod
}

export function characterSetupFormDefaults(draft?: CharacterSetupDraft | null): CharacterSetupFormDefaults {
  if (!draft) {
    return {
      name: '',
      archetype: '',
      alignment: '',
      abilityScores: null,
      abilityScoreMethod: 'pointBuy'
    }
  }

  return {
    name: draft.name,
    archetype: draft.archetype,
    alignment: draft.alignment,
    abilityScores: draft.abilityScores,
    abilityScoreMethod: draft.abilityScoreMethod
  }
}
