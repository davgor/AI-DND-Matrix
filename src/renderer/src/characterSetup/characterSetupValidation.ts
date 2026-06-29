import type { AbilityScores } from '../../../engine/abilities'
import type { Archetype } from '../../../engine/hp'
import type { Alignment } from '../../../shared/alignment/types'

export interface CharacterSetupState {
  name: string
  archetype: Archetype | ''
  alignment: Alignment | ''
  abilityScores: AbilityScores | null
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
  return null
}
