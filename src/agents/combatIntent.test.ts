import { describe, expect, it } from 'vitest'
import { validateCombatIntent, type IntentInterpretation } from './dm'

describe('combat intent flee classification', () => {
  const fleeIntent: IntentInterpretation = { checkNeeded: false, combatIntent: 'flee' }

  it('rejects flee outside an active encounter', () => {
    expect(
      validateCombatIntent(fleeIntent, {
        encounterActive: false,
        playerCanAct: true
      })
    ).toBe(false)
  })

  it('rejects flee off-turn', () => {
    expect(
      validateCombatIntent(fleeIntent, {
        encounterActive: true,
        playerCanAct: false
      })
    ).toBe(false)
  })

  it('allows flee on player turn during encounter', () => {
    expect(
      validateCombatIntent(fleeIntent, {
        encounterActive: true,
        playerCanAct: true
      })
    ).toBe(true)
  })
})
