import { describe, expect, it } from 'vitest'
import {
  isPerkCategory,
  isXpSource,
  parseLevelUpAgentResponse,
  parseXpDifficultyAgentResponse
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

  it('parseXpDifficultyAgentResponse accepts every known difficulty', () => {
    for (const difficulty of ['easy', 'medium', 'hard', 'extreme', 'impossible']) {
      expect(parseXpDifficultyAgentResponse({ difficulty })).toEqual({ difficulty })
    }
  })

  it('parseXpDifficultyAgentResponse normalizes case and whitespace', () => {
    expect(parseXpDifficultyAgentResponse({ difficulty: ' Extreme ' })).toEqual({
      difficulty: 'extreme'
    })
  })

  it('parseXpDifficultyAgentResponse rejects unknown or missing difficulty', () => {
    expect(parseXpDifficultyAgentResponse({ difficulty: 'apocalyptic' })).toBeNull()
    expect(parseXpDifficultyAgentResponse({ difficulty: 3 })).toBeNull()
    expect(parseXpDifficultyAgentResponse({})).toBeNull()
    expect(parseXpDifficultyAgentResponse(null)).toBeNull()
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
