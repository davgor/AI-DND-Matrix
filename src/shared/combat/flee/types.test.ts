import { describe, expect, it } from 'vitest'
import {
  fleeExpositionCopy,
  isDmEscapeOutcome,
  isEncounterPursuitState,
  parseDmEscapeJudgment,
  validateDmEscapeJudgment
} from './types'

describe('flee type guards', () => {
  it('accepts valid pursuit and escape values', () => {
    expect(isEncounterPursuitState('engaged')).toBe(true)
    expect(isEncounterPursuitState('pursued')).toBe(true)
    expect(isEncounterPursuitState('fled')).toBe(false)
    expect(isDmEscapeOutcome('escaped')).toBe(true)
    expect(isDmEscapeOutcome('still_pursued')).toBe(true)
  })
})

describe('parseDmEscapeJudgment', () => {
  it('parses valid judgment JSON', () => {
    expect(
      parseDmEscapeJudgment({ outcome: 'escaped', narrationText: 'You slip into the alley.' })
    ).toEqual({ outcome: 'escaped', narrationText: 'You slip into the alley.' })
  })

  it('rejects escaped on failed check via validateDmEscapeJudgment', () => {
    const raw = { outcome: 'escaped' as const, narrationText: 'You are free.' }
    expect(validateDmEscapeJudgment(raw, false)).toEqual({
      outcome: 'still_pursued',
      narrationText: 'You are free.'
    })
    expect(validateDmEscapeJudgment(raw, true)).toEqual(raw)
  })
})

describe('fleeExpositionCopy', () => {
  it('prefixes each flee phase distinctly', () => {
    expect(fleeExpositionCopy('failed', 'A goblin grabs your cloak.')).toContain('Flee failed')
    expect(fleeExpositionCopy('pursued', 'You are not safe yet.')).toContain('Still pursued')
    expect(fleeExpositionCopy('escaped', 'Combat is behind you.')).toContain('Escaped')
  })
})
