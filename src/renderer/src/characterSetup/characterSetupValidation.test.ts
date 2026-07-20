import { describe, expect, it } from 'vitest'
import { validateCharacterSetup, type CharacterSetupState } from './characterSetupValidation'

const VALID_SCORES = { body: 14, agility: 12, mind: 10, presence: 8 }

function baseState(overrides: Partial<CharacterSetupState> = {}): CharacterSetupState {
  return {
    name: 'Kael',
    archetype: 'fighter',
    alignment: 'true_neutral',
    abilityScores: VALID_SCORES,
    abilityScoreMethod: 'pointBuy',
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

  it('blocks invalid point buy scores even when all four values are present', () => {
    expect(
      validateCharacterSetup(
        baseState({
          abilityScores: { body: 16, agility: 14, mind: 15, presence: 13 },
          abilityScoreMethod: 'pointBuy'
        })
      )
    ).toBe('Point buy scores must stay within the 8-20 range and 12-point budget.')
  })

  it('allows rolled stats when the roll method is selected', () => {
    expect(
      validateCharacterSetup(
        baseState({
          abilityScores: { body: 16, agility: 14, mind: 15, presence: 13 },
          abilityScoreMethod: 'roll'
        })
      )
    ).toBeNull()
  })
})
