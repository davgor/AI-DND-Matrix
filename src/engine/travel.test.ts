import { describe, expect, it } from 'vitest'
import { resolveTravel } from './travel'

describe('resolveTravel', () => {
  it('passes through a normal estimate unchanged', () => {
    expect(resolveTravel(5)).toBe(5)
  })

  it('clamps a too-large estimate down to the sane maximum', () => {
    expect(resolveTravel(90)).toBe(30)
  })

  it('clamps a negative estimate to zero', () => {
    expect(resolveTravel(-4)).toBe(0)
  })
})
