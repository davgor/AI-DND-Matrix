import { describe, expect, it } from 'vitest'
import type { Ability } from './abilities'
import {
  attackAdvantageMode,
  autoFailsSave,
  advantageModeFromConditions,
  canAct,
  conditionsFromStats,
  hasDisadvantageOn,
  parseConditions,
  type Condition
} from './conditions'

describe('conditions canAct', () => {
  it('stunned prevents actions', () => {
    expect(canAct(['stunned'])).toBe(false)
  })

  it('unconscious prevents actions', () => {
    expect(canAct(['unconscious'])).toBe(false)
  })

  it('canAct is true with no incapacitating conditions active', () => {
    expect(canAct(['prone', 'poisoned'])).toBe(true)
  })
})

describe('CONDITION_EFFECTS table helpers', () => {
  it('prone imposes disadvantage on agility only', () => {
    expect(hasDisadvantageOn(['prone'], 'agility')).toBe(true)
    expect(hasDisadvantageOn(['prone'], 'body')).toBe(false)
    expect(advantageModeFromConditions(['prone'], 'agility')).toBe('disadvantage')
    expect(advantageModeFromConditions(['prone'], 'mind')).toBe('none')
  })

  it('restrained imposes disadvantage on agility only', () => {
    expect(hasDisadvantageOn(['restrained'], 'agility')).toBe(true)
    expect(hasDisadvantageOn(['restrained'], 'presence')).toBe(false)
  })

  it('poisoned imposes disadvantage on all abilities', () => {
    const abilities: Ability[] = ['body', 'agility', 'mind', 'presence']
    for (const ability of abilities) {
      expect(hasDisadvantageOn(['poisoned'], ability)).toBe(true)
      expect(advantageModeFromConditions(['poisoned'], ability)).toBe('disadvantage')
    }
  })

  it('stunned and unconscious auto-fail body and agility saves', () => {
    for (const condition of ['stunned', 'unconscious'] as Condition[]) {
      expect(autoFailsSave([condition], 'body')).toBe(true)
      expect(autoFailsSave([condition], 'agility')).toBe(true)
      expect(autoFailsSave([condition], 'mind')).toBe(false)
      expect(autoFailsSave([condition], 'presence')).toBe(false)
      expect(canAct([condition])).toBe(false)
    }
  })

  it('attackAdvantageMode follows agility disadvantage rules', () => {
    expect(attackAdvantageMode(['poisoned'])).toBe('disadvantage')
    expect(attackAdvantageMode(['prone'])).toBe('disadvantage')
    expect(attackAdvantageMode(['restrained'])).toBe('disadvantage')
    expect(attackAdvantageMode([])).toBe('none')
    expect(attackAdvantageMode(['stunned'])).toBe('none')
  })
})

describe('parseConditions', () => {
  it('filters unknown values and reads stats.conditions', () => {
    expect(parseConditions(['poisoned', 'nope', 3, 'prone'])).toEqual(['poisoned', 'prone'])
    expect(conditionsFromStats({ conditions: ['unconscious'] })).toEqual(['unconscious'])
    expect(conditionsFromStats(undefined)).toEqual([])
  })
})
