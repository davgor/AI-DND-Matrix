import { useEffect, useState } from 'react'
import type { Archetype } from '../../../engine/hp'
import type { AbilityScores } from '../../../engine/abilities'
import type { Alignment } from '../../../shared/alignment/types'
import type { AbilityScoreMethod } from '../../../shared/characterSetup/abilityScoreMethod'
import { characterSetupFormDefaults, type CharacterSetupDraft } from './characterSetupDraft'
import {
  readCharacterSetupSessionDraft,
  resolveCharacterSetupFormDefaults
} from './characterSetupSessionDraft'

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

function initialDefaults(
  campaignId: string,
  draft?: CharacterSetupDraft | null
): ReturnType<typeof resolveCharacterSetupFormDefaults> {
  return resolveCharacterSetupFormDefaults(
    draft ? characterSetupFormDefaults(draft) : null,
    readCharacterSetupSessionDraft(campaignId)
  )
}

function draftResumeKey(draft?: CharacterSetupDraft | null): string {
  if (!draft) {
    return 'new'
  }
  return [
    draft.playerCharacterId,
    draft.name,
    draft.archetype,
    draft.alignment,
    draft.abilityScoreMethod,
    JSON.stringify(draft.abilityScores)
  ].join('|')
}

export function useCharacterSetupFormState(
  campaignId: string,
  draft?: CharacterSetupDraft | null
): CharacterSetupFormState {
  const resumeKey = draftResumeKey(draft)
  const [name, setName] = useState('')
  const [archetype, setArchetype] = useState<Archetype | ''>('')
  const [alignment, setAlignment] = useState<Alignment | ''>('')
  const [abilityScores, setAbilityScores] = useState<AbilityScores | null>(null)
  const [abilityScoreMethod, setAbilityScoreMethod] = useState<AbilityScoreMethod>('pointBuy')

  useEffect(() => {
    const nextDefaults = initialDefaults(campaignId, draft)
    setName(nextDefaults.name)
    setArchetype(nextDefaults.archetype)
    setAlignment(nextDefaults.alignment)
    setAbilityScores(nextDefaults.abilityScores)
    setAbilityScoreMethod(nextDefaults.abilityScoreMethod)
  }, [campaignId, resumeKey])

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
