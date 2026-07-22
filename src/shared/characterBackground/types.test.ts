import { describe, expect, it } from 'vitest'
import { isBackgroundKey, parseBackgroundKey } from './types'

describe('characterBackground types', () => {
  it('accepts known background keys case-insensitively with whitespace tolerance', () => {
    expect(parseBackgroundKey('soldier')).toBe('soldier')
    expect(parseBackgroundKey('Soldier')).toBe('soldier')
    expect(parseBackgroundKey(' street_thug ')).toBe('street_thug')
    expect(parseBackgroundKey('Street Thug')).toBe('street_thug')
    expect(parseBackgroundKey('isekaid')).toBe('isekaid')
    expect(parseBackgroundKey("Isekai'd")).toBe('isekaid')
  })

  it('rejects unknown background keys', () => {
    expect(parseBackgroundKey('not-a-background')).toBeUndefined()
    expect(parseBackgroundKey('')).toBeUndefined()
    expect(parseBackgroundKey(null)).toBeUndefined()
  })

  it('maps common invented village-role backgrounds onto the roster (147)', () => {
    expect(parseBackgroundKey('herbalist')).toBe('hermit')
    expect(parseBackgroundKey('Healer')).toBe('acolyte')
    expect(parseBackgroundKey('gardener')).toBe('farmhand')
  })

  it('isBackgroundKey mirrors parseBackgroundKey', () => {
    expect(isBackgroundKey('noble')).toBe(true)
    expect(isBackgroundKey('bogus')).toBe(false)
  })
})
