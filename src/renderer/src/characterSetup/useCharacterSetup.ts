import { useState } from 'react'
import type { Archetype } from '../../../engine/hp'
import type { AbilityScores } from '../../../engine/abilities'
import type { Alignment } from '../../../shared/alignment/types'
import type { AiPartyMemberInput } from '../../../main/characterCreationIpc'
import type { CharacterSetupState } from './characterSetupValidation'
import { useImageSelectors } from './useImageSelectors'
import { useSubmitCharacterSetup } from './useSubmitCharacterSetup'

export interface CharacterSetupController {
  name: string
  setName: (value: string) => void
  archetype: Archetype | ''
  setArchetype: (value: Archetype | '') => void
  alignment: Alignment | ''
  setAlignment: (value: Alignment | '') => void
  setAbilityScores: (scores: AbilityScores | null) => void
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
  const [alignment, setAlignment] = useState<Alignment | ''>('')
  const [abilityScores, setAbilityScores] = useState<AbilityScores | null>(null)
  const [partyMembers, setPartyMembers] = useState<AiPartyMemberInput[]>([])
  const images = useImageSelectors()

  const formState: CharacterSetupState = {
    name,
    archetype,
    alignment,
    abilityScores
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
    alignment,
    setAlignment,
    setAbilityScores,
    setPartyMembers,
    selectPortrait: images.selectPortrait,
    selectSheetBackground: images.selectSheetBackground,
    ...submission
  }
}
