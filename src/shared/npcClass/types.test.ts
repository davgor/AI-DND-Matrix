import { describe, expect, it } from 'vitest'
import { NPC_CLASS_KEYS, NPC_CLASS_ROSTER, parseNpcClassKey } from './types'

describe('NPC_CLASS_ROSTER', () => {
  it('covers every key with non-empty label and blurb', () => {
    expect(NPC_CLASS_ROSTER).toHaveLength(NPC_CLASS_KEYS.length)
    const keys = new Set<string>()
    for (const entry of NPC_CLASS_ROSTER) {
      expect(entry.label.trim().length).toBeGreaterThan(0)
      expect(entry.blurb.trim().length).toBeGreaterThan(0)
      expect(keys.has(entry.key)).toBe(false)
      keys.add(entry.key)
    }
    expect(keys.size).toBe(NPC_CLASS_KEYS.length)
  })
})

describe('parseNpcClassKey', () => {
  it('accepts case-insensitive and whitespace variants', () => {
    expect(parseNpcClassKey('Fighter')).toBe('fighter')
    expect(parseNpcClassKey(' commoner ')).toBe('commoner')
  })

  it('maps common LLM class and role synonyms onto the roster (147)', () => {
    expect(parseNpcClassKey('wizard')).toBe('mage')
    expect(parseNpcClassKey('Healer')).toBe('cleric')
    expect(parseNpcClassKey('herbalist')).toBe('commoner')
    expect(parseNpcClassKey('gardener')).toBe('commoner')
    expect(parseNpcClassKey('soldier')).toBe('fighter')
    expect(parseNpcClassKey('druid')).toBe('ranger')
    expect(parseNpcClassKey('bard')).toBe('commoner')
  })

  it('rejects unknown keys', () => {
    expect(parseNpcClassKey('archmage-supreme')).toBeUndefined()
    expect(parseNpcClassKey('')).toBeUndefined()
  })
})
