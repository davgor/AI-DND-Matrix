import type { AbilityScores } from '../../../engine/abilities'
import type { Archetype } from '../../../engine/hp'
import type { Alignment } from '../../../shared/alignment/types'
import type { AbilityScoreMethod } from '../../../shared/characterSetup/abilityScoreMethod'
import { resolvePointBuy, resolveStandardArray } from '../../../engine/abilities'

export interface CharacterSetupState {
  name: string
  archetype: Archetype | ''
  alignment: Alignment | ''
  abilityScores: AbilityScores | null
  abilityScoreMethod: AbilityScoreMethod
}

function validateAbilityScoresForMethod(
  scores: AbilityScores,
  method: AbilityScoreMethod
): string | null {
  if (method === 'pointBuy' && !resolvePointBuy(scores).valid) {
    return 'Point buy scores must stay within the 8-20 range and 12-point budget.'
  }
  if (method === 'standardArray' && !resolveStandardArray(scores).valid) {
    return 'Assign each standard array value exactly once.'
  }
  return null
}

export function validateCharacterSetup(state: CharacterSetupState): string | null {
  if (!state.name.trim()) {
    return 'Character name is required.'
  }
  if (!state.archetype) {
    return 'Choose an archetype.'
  }
  if (!state.alignment) {
    return 'Choose an alignment.'
  }
  if (!state.abilityScores) {
    return 'Assign all four ability scores.'
  }
  return validateAbilityScoresForMethod(state.abilityScores, state.abilityScoreMethod)
}
