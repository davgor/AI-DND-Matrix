import { describe, expect, it } from 'vitest'
import { resolveLongRest, resolveShortRest } from './rest'

describe('resolveShortRest', () => {
  it('recovers a partial, defined amount of HP', () => {
    const result = resolveShortRest(10, 40)
    expect(result).toEqual({ hpRestored: 20, inGameDateAdvanceDays: 0 })
  })

  it('never restores more than the missing HP', () => {
    const result = resolveShortRest(38, 40)
    expect(result.hpRestored).toBe(2)
  })
})

describe('resolveLongRest', () => {
  it('recovers full HP and advances the in-game date by 1 day', () => {
    const result = resolveLongRest(5, 40)
    expect(result).toEqual({ hpRestored: 35, inGameDateAdvanceDays: 1 })
  })
})
