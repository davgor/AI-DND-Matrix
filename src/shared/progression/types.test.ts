import { describe, expect, it } from 'vitest'
import {
  isPerkCategory,
  isXpSource,
  parseLevelUpAgentResponse,
  parseXpAwardAgentResponse
} from './types'

describe('progression shared type guards', () => {
  it('isXpSource accepts valid sources', () => {
    expect(isXpSource('encounter_end')).toBe(true)
    expect(isXpSource('quest_complete')).toBe(true)
    expect(isXpSource('loot')).toBe(false)
  })

  it('isPerkCategory accepts engine categories', () => {
    expect(isPerkCategory('spell_access')).toBe(true)
    expect(isPerkCategory('extra_attack')).toBe(true)
    expect(isPerkCategory('magic_bonus')).toBe(false)
  })

  it('parseXpAwardAgentResponse accepts valid JSON', () => {
    const parsed = parseXpAwardAgentResponse({
      narrationText: 'You grow wiser.',
      xpAmount: 120
    })
    expect(parsed).toEqual({ narrationText: 'You grow wiser.', xpAmount: 120 })
  })

  it('parseXpAwardAgentResponse rejects missing fields', () => {
    expect(parseXpAwardAgentResponse({ narrationText: 'x' })).toBeNull()
    expect(parseXpAwardAgentResponse({ xpAmount: 1 })).toBeNull()
  })

  it('parseLevelUpAgentResponse requires exactly 3 distinct perks', () => {
    const valid = parseLevelUpAgentResponse({
      narrationText: 'Choose your path.',
      perks: [
        { id: 'a', name: 'A', description: 'a', category: 'ac_bonus', flavorTags: ['martial'] },
        { id: 'b', name: 'B', description: 'b', category: 'spell_access', flavorTags: ['arcane'], catalogSpellKey: 'firebolt' },
        { id: 'c', name: 'C', description: 'c', category: 'extra_attack', flavorTags: ['combat'] }
      ]
    })
    expect(valid?.perks).toHaveLength(3)

    const twoOnly = parseLevelUpAgentResponse({
      narrationText: 'Nope.',
      perks: [
        { id: 'a', name: 'A', description: 'a', category: 'ac_bonus', flavorTags: [] },
        { id: 'b', name: 'B', description: 'b', category: 'ac_bonus', flavorTags: [] }
      ]
    })
    expect(twoOnly).toBeNull()
  })
})
