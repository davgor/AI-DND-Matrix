import { describe, expect, it } from 'vitest'
import { resolveBackgroundDisplayLabel } from './resolveLabel'
import {
  CUSTOM_BACKGROUND_KEY,
  isCustomBackgroundKey,
  isPlayerBackgroundKey,
  normalizeCustomBackgroundLabel
} from './types'

describe('resolveBackgroundDisplayLabel', () => {
  it('returns roster label for known keys', () => {
    expect(resolveBackgroundDisplayLabel('soldier')).toBe('Soldier')
  })

  it('returns null for missing keys', () => {
    expect(resolveBackgroundDisplayLabel(null)).toBeNull()
    expect(resolveBackgroundDisplayLabel('bogus')).toBeNull()
  })

  it('returns custom label for custom background key', () => {
    expect(resolveBackgroundDisplayLabel(CUSTOM_BACKGROUND_KEY, 'River Smuggler')).toBe(
      'River Smuggler'
    )
    expect(resolveBackgroundDisplayLabel('custom', '  River Smuggler  ')).toBe('River Smuggler')
  })

  it('returns null when custom key has empty label', () => {
    expect(resolveBackgroundDisplayLabel(CUSTOM_BACKGROUND_KEY, '   ')).toBeNull()
    expect(resolveBackgroundDisplayLabel(CUSTOM_BACKGROUND_KEY, null)).toBeNull()
  })
})

describe('custom background helpers', () => {
  it('recognizes custom sentinel and rejects empty labels', () => {
    expect(isCustomBackgroundKey('custom')).toBe(true)
    expect(isCustomBackgroundKey('Custom')).toBe(true)
    expect(isPlayerBackgroundKey('custom')).toBe(true)
    expect(isPlayerBackgroundKey('soldier')).toBe(true)
    expect(isPlayerBackgroundKey('bogus')).toBe(false)
    expect(normalizeCustomBackgroundLabel('  Label  ')).toBe('Label')
    expect(normalizeCustomBackgroundLabel('')).toBeNull()
  })
})
