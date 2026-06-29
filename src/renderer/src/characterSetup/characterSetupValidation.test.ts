import { describe, expect, it } from 'vitest'
import { validateCharacterSetup, type CharacterSetupState } from './characterSetupValidation'

const VALID_SCORES = { body: 12, agility: 14, mind: 10, presence: 10 }

function baseState(overrides: Partial<CharacterSetupState> = {}): CharacterSetupState {
  return {
    name: 'Kael',
    archetype: 'fighter',
    alignment: 'true_neutral',
    abilityScores: VALID_SCORES,
    ...overrides
  }
}

describe('validateCharacterSetup (009.6)', () => {
  it('blocks submission until name is set', () => {
    expect(validateCharacterSetup(baseState({ name: '' }))).toBe('Character name is required.')
  })

  it('blocks submission until an archetype is chosen', () => {
    expect(validateCharacterSetup(baseState({ archetype: '' }))).toBe('Choose an archetype.')
  })

  it('blocks submission until an alignment is chosen', () => {
    expect(validateCharacterSetup(baseState({ alignment: '' }))).toBe('Choose an alignment.')
  })

  it('blocks submission until all four ability scores are assigned', () => {
    expect(validateCharacterSetup(baseState({ abilityScores: null }))).toBe(
      'Assign all four ability scores.'
    )
  })

  it('allows a fully valid form', () => {
    expect(validateCharacterSetup(baseState())).toBeNull()
  })
})
