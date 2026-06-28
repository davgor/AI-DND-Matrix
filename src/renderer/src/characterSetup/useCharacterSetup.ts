import { useState } from 'react'
import type { Archetype } from '../../../engine/hp'
import type { AbilityScores } from '../../../engine/abilities'
import type { DeathMode, RespawnRules } from '../../../db/repositories/campaigns'
import type { AiPartyMemberInput } from '../../../main/characterCreationIpc'
import type { CharacterSetupState } from './characterSetupValidation'
import { useDeathModeState } from './useDeathModeState'
import { useImageSelectors } from './useImageSelectors'
import { useSubmitCharacterSetup } from './useSubmitCharacterSetup'

export interface CharacterSetupController {
  name: string
  setName: (value: string) => void
  archetype: Archetype | ''
  setArchetype: (value: Archetype | '') => void
  setAbilityScores: (scores: AbilityScores | null) => void
  setDeathMode: (deathMode: DeathMode, respawnRules: RespawnRules | null) => void
  setPartyMembers: (members: AiPartyMemberInput[]) => void
  selectPortrait: () => Promise<void>
  selectSheetBackground: () => Promise<void>
  validationError: string | null
  submitting: boolean
  handleSubmit: () => Promise<void>
}

export function useCharacterSetup(
  campaignId: string,
  onComplete: () => void
): CharacterSetupController {
  const [name, setName] = useState('')
  const [archetype, setArchetype] = useState<Archetype | ''>('')
  const [abilityScores, setAbilityScores] = useState<AbilityScores | null>(null)
  const [partyMembers, setPartyMembers] = useState<AiPartyMemberInput[]>([])
  const images = useImageSelectors()
  const deathModeState = useDeathModeState()

  const formState: CharacterSetupState = {
    name,
    archetype,
    abilityScores,
    deathMode: deathModeState.deathMode,
    respawnRules: deathModeState.respawnRules
  }
  const submission = useSubmitCharacterSetup(
    campaignId,
    formState,
    { partyMembers, portraitPath: images.portraitPath, sheetBackgroundPath: images.sheetBackgroundPath },
    onComplete
  )

  return {
    name,
    setName,
    archetype,
    setArchetype,
    setAbilityScores,
    setDeathMode: deathModeState.setDeathMode,
    setPartyMembers,
    selectPortrait: images.selectPortrait,
    selectSheetBackground: images.selectSheetBackground,
    ...submission
  }
}
