import { describe, expect, it } from 'vitest'
import { buildCharacterSetupController } from './buildCharacterSetupController'
import type { CharacterSetupFormState } from './useCharacterSetupFormState'
import type { CharacterSetupDraft } from './characterSetupDraft'
import type { SubmitController } from './useSubmitCharacterSetup'

function noopForm(overrides: Partial<CharacterSetupFormState> = {}): CharacterSetupFormState {
  return {
    name: '',
    setName: () => {},
    archetype: '',
    setArchetype: () => {},
    alignment: '',
    setAlignment: () => {},
    abilityScores: null,
    setAbilityScores: () => {},
    // Simulates the real bug: on the render right after a resumed draft mounts,
    // the form's own abilityScoreMethod state hasn't caught up yet (it corrects
    // asynchronously via effect) and is still sitting at its 'pointBuy' default.
    abilityScoreMethod: 'pointBuy',
    setAbilityScoreMethod: () => {},
    ...overrides
  }
}

function noopSubmission(): SubmitController {
  return {
    validationError: null,
    submitting: false,
    handleSubmit: async () => {}
  }
}

const noopImages = {
  selectPortrait: async () => {},
  selectSheetBackground: async () => {}
}

describe('buildCharacterSetupController (resume race condition)', () => {
  it('sources initialAbilityScoreMethod from the resumed draft, not the not-yet-synced form state', () => {
    const draft: CharacterSetupDraft = {
      playerCharacterId: 'char-1',
      name: 'Kael',
      archetype: 'fighter',
      alignment: 'true_neutral',
      abilityScores: { body: 16, agility: 14, mind: 15, presence: 13 },
      abilityScoreMethod: 'roll',
      portraitPath: null,
      sheetBackgroundPath: null
    }

    const controller = buildCharacterSetupController(noopForm(), noopImages, noopSubmission(), draft)

    expect(controller.initialAbilityScoreMethod).toBe('roll')
  })

  it('falls back to the form default when there is no draft to resume', () => {
    const controller = buildCharacterSetupController(
      noopForm({ abilityScoreMethod: 'pointBuy' }),
      noopImages,
      noopSubmission(),
      null
    )

    expect(controller.initialAbilityScoreMethod).toBe('pointBuy')
  })
})
