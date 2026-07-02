import type { Archetype } from '../../../engine/hp'
import type { AbilityScores } from '../../../engine/abilities'
import type { Alignment } from '../../../shared/alignment/types'
import type { AbilityScoreMethod } from '../../../shared/characterSetup/abilityScoreMethod'

export interface CharacterSetupController {
  name: string
  setName: (value: string) => void
  archetype: Archetype | ''
  setArchetype: (value: Archetype | '') => void
  alignment: Alignment | ''
  setAlignment: (value: Alignment | '') => void
  setAbilityScores: (scores: AbilityScores | null) => void
  setAbilityScoreMethod: (method: AbilityScoreMethod) => void
  selectPortrait: () => Promise<void>
  selectSheetBackground: () => Promise<void>
  validationError: string | null
  submitting: boolean
  handleSubmit: () => Promise<void>
  resumeCharacterId: string | null
  initialAbilityScores: AbilityScores | null
  initialAbilityScoreMethod: AbilityScoreMethod
}
