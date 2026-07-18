import { describe, expect, it } from 'vitest'
import { canAct } from './conditions'

describe('conditions', () => {
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
