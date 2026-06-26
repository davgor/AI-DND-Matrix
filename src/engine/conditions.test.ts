import { describe, expect, it } from 'vitest'
import { canAct, conditionForcesAutoFailSave, conditionForcesDisadvantage } from './conditions'

describe('conditions', () => {
  it('prone forces disadvantage on Agility checks', () => {
    expect(conditionForcesDisadvantage('prone', 'agility')).toBe(true)
    expect(conditionForcesDisadvantage('prone', 'mind')).toBe(false)
  })

  it('stunned prevents actions and auto-fails Body and Agility saves', () => {
    expect(canAct(['stunned'])).toBe(false)
    expect(conditionForcesAutoFailSave('stunned', 'body')).toBe(true)
    expect(conditionForcesAutoFailSave('stunned', 'agility')).toBe(true)
    expect(conditionForcesAutoFailSave('stunned', 'mind')).toBe(false)
  })

  it('poisoned forces disadvantage on every ability', () => {
    expect(conditionForcesDisadvantage('poisoned', 'body')).toBe(true)
    expect(conditionForcesDisadvantage('poisoned', 'presence')).toBe(true)
  })

  it('restrained forces disadvantage on Agility checks/saves', () => {
    expect(conditionForcesDisadvantage('restrained', 'agility')).toBe(true)
    expect(conditionForcesDisadvantage('restrained', 'body')).toBe(false)
  })

  it('unconscious prevents actions and auto-fails Body and Agility saves', () => {
    expect(canAct(['unconscious'])).toBe(false)
    expect(conditionForcesAutoFailSave('unconscious', 'body')).toBe(true)
  })

  it('canAct is true with no incapacitating conditions active', () => {
    expect(canAct(['prone', 'poisoned'])).toBe(true)
  })
})
