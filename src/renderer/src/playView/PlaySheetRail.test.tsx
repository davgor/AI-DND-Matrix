import { describe, expect, it } from 'vitest'
import { resolveDefaultPlaySheetTab } from './PlaySheetRail'

describe('PlaySheetRail tabs', () => {
  it('defaults to combat tab when combat is active', () => {
    expect(resolveDefaultPlaySheetTab(true)).toBe('combat')
    expect(resolveDefaultPlaySheetTab(false)).toBe('character')
  })
})
