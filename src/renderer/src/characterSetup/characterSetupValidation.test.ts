import { describe, expect, it } from 'vitest'
import { validateCharacterSetup, type CharacterSetupState } from './characterSetupValidation'

const VALID_SCORES = { body: 12, agility: 14, mind: 10, presence: 10 }

function baseState(overrides: Partial<CharacterSetupState> = {}): CharacterSetupState {
  return {
    name: 'Kael',
    archetype: 'fighter',
    abilityScores: VALID_SCORES,
    deathMode: 'legendary',
    respawnRules: null,
    ...overrides
  }
}

describe('validateCharacterSetup (009.6)', () => {
  it('blocks submission until name is set', () => {
    expect(validateCharacterSetup(baseState({ name: '' }))).toBe('Name is required.')
  })

  it('blocks submission until an archetype is chosen', () => {
    expect(validateCharacterSetup(baseState({ archetype: '' }))).toBe('Choose an archetype.')
  })

  it('blocks submission until all four ability scores are assigned', () => {
    expect(validateCharacterSetup(baseState({ abilityScores: null }))).toBe(
      'Assign all four ability scores.'
    )
  })

  it('blocks submission when respawn mode has no respawn rules defined', () => {
    expect(validateCharacterSetup(baseState({ deathMode: 'respawn', respawnRules: null }))).toBe(
      'Respawn mode requires a location, cost, and limit to be defined.'
    )
  })

  it('allows a fully valid legendary-mode form', () => {
    expect(validateCharacterSetup(baseState())).toBeNull()
  })

  it('allows a fully valid respawn-mode form once rules are defined', () => {
    const state = baseState({
      deathMode: 'respawn',
      respawnRules: { location: 'Last Shrine', cost: 50, limit: 3 }
    })
    expect(validateCharacterSetup(state)).toBeNull()
  })
})
