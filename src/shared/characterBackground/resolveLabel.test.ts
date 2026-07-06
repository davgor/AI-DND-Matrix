import { describe, expect, it } from 'vitest'
import { resolveBackgroundDisplayLabel } from './resolveLabel'

describe('resolveBackgroundDisplayLabel', () => {
  it('returns roster label for known keys', () => {
    expect(resolveBackgroundDisplayLabel('soldier')).toBe('Soldier')
  })

  it('returns null for missing keys', () => {
    expect(resolveBackgroundDisplayLabel(null)).toBeNull()
    expect(resolveBackgroundDisplayLabel('bogus')).toBeNull()
  })
})
