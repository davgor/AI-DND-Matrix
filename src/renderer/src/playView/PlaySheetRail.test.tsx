import { describe, expect, it } from 'vitest'
import { resolveDefaultPlaySheetTab } from './PlaySheetRail'

describe('PlaySheetRail tabs', () => {
  it('defaults to the character tab', () => {
    expect(resolveDefaultPlaySheetTab()).toBe('character')
  })
})
