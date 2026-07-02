import { useState } from 'react'
import type { Archetype } from '../../../engine/hp'
import type { AbilityScores } from '../../../engine/abilities'
import type { Alignment } from '../../../shared/alignment/types'
import type { AbilityScoreMethod } from '../../../shared/characterSetup/abilityScoreMethod'
import { characterSetupFormDefaults, type CharacterSetupDraft } from './characterSetupDraft'

export interface CharacterSetupFormState {
  name: string
  setName: (value: string) => void
  archetype: Archetype | ''
  setArchetype: (value: Archetype | '') => void
  alignment: Alignment | ''
  setAlignment: (value: Alignment | '') => void
  abilityScores: AbilityScores | null
  setAbilityScores: (scores: AbilityScores | null) => void
  abilityScoreMethod: AbilityScoreMethod
  setAbilityScoreMethod: (method: AbilityScoreMethod) => void
}

export function useCharacterSetupFormState(draft?: CharacterSetupDraft | null): CharacterSetupFormState {
  const defaults = characterSetupFormDefaults(draft)
  const [name, setName] = useState(defaults.name)
  const [archetype, setArchetype] = useState<Archetype | ''>(defaults.archetype)
  const [alignment, setAlignment] = useState<Alignment | ''>(defaults.alignment)
  const [abilityScores, setAbilityScores] = useState<AbilityScores | null>(defaults.abilityScores)
  const [abilityScoreMethod, setAbilityScoreMethod] = useState<AbilityScoreMethod>(defaults.abilityScoreMethod)

  return {
    name,
    setName,
    archetype,
    setArchetype,
    alignment,
    setAlignment,
    abilityScores,
    setAbilityScores,
    abilityScoreMethod,
    setAbilityScoreMethod
  }
}
