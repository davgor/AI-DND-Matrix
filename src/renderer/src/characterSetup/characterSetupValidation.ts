import type { AbilityScores } from '../../../engine/abilities'
import type { Archetype } from '../../../engine/hp'
import type { DeathMode, RespawnRules } from '../../../db/repositories/campaigns'

export interface CharacterSetupState {
  name: string
  archetype: Archetype | ''
  abilityScores: AbilityScores | null
  deathMode: DeathMode
  respawnRules: RespawnRules | null
}

export function validateCharacterSetup(state: CharacterSetupState): string | null {
  if (!state.name.trim()) {
    return 'Name is required.'
  }
  if (!state.archetype) {
    return 'Choose an archetype.'
  }
  if (!state.abilityScores) {
    return 'Assign all four ability scores.'
  }
  if (state.deathMode === 'respawn' && !state.respawnRules) {
    return 'Respawn mode requires a location, cost, and limit to be defined.'
  }
  return null
}
