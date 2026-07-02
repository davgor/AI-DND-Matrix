import { describe, expect, it } from 'vitest'
import type { KnownSpellView } from '../shared/spells/types'
import { buildKnownSpellsPromptSection, windowKnownSpellsForNarration } from './spellWindow'

function spell(name: string, cost: number): KnownSpellView {
  return {
    catalogKey: name.toLowerCase(),
    name,
    effectType: 'damage',
    range: 'ranged',
    cost,
    tags: [],
    constraintsHint: null,
    rulesText: 'rules'
  }
}

describe('windowKnownSpellsForNarration', () => {
  it('bounds known spells for narration context', () => {
    const spells = Array.from({ length: 10 }, (_, index) => spell(`Spell ${index}`, 1))
    const windowed = windowKnownSpellsForNarration(spells)
    expect(windowed).toHaveLength(8)
    expect(windowed[0]?.name).toBe('Spell 0')
  })
})

describe('buildKnownSpellsPromptSection', () => {
  it('returns empty string when no spells', () => {
    expect(buildKnownSpellsPromptSection([])).toBe('')
  })

  it('includes spell names and costs', () => {
    const section = buildKnownSpellsPromptSection([{ name: 'Firebolt', cost: 1 }])
    expect(section).toContain('Firebolt')
    expect(section).toContain('spellGrants')
  })
})
