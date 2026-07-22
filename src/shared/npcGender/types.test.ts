import { describe, expect, it } from 'vitest'
import { GENDER_KEYS, GENDER_ROSTER, parseGenderKey } from './types'

describe('GENDER_ROSTER', () => {
  it('covers every key with non-empty label and blurb', () => {
    expect(GENDER_ROSTER).toHaveLength(GENDER_KEYS.length)
    const keys = new Set<string>()
    for (const entry of GENDER_ROSTER) {
      expect(entry.label.trim().length).toBeGreaterThan(0)
      expect(entry.blurb.trim().length).toBeGreaterThan(0)
      expect(keys.has(entry.key)).toBe(false)
      keys.add(entry.key)
    }
    expect(keys.size).toBe(GENDER_KEYS.length)
  })
})

describe('parseGenderKey', () => {
  it('accepts case-insensitive and whitespace variants', () => {
    expect(parseGenderKey('Man')).toBe('man')
    expect(parseGenderKey(' nonbinary ')).toBe('nonbinary')
    expect(parseGenderKey('True Neutral')).toBeUndefined()
  })

  it('maps common LLM male/female aliases to roster keys (147)', () => {
    expect(parseGenderKey('male')).toBe('man')
    expect(parseGenderKey('Female')).toBe('woman')
    expect(parseGenderKey('he/him')).toBe('man')
    expect(parseGenderKey('she/her')).toBe('woman')
    expect(parseGenderKey('they/them')).toBe('nonbinary')
  })

  it('rejects unknown keys', () => {
    expect(parseGenderKey('alien')).toBeUndefined()
    expect(parseGenderKey('')).toBeUndefined()
  })
})
