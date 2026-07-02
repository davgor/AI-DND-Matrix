import { describe, expect, it } from 'vitest'
import { formatSpellTooltip } from './spellDisplay'

describe('formatSpellTooltip', () => {
  it('describes damage type and tags for firebolt', () => {
    expect(
      formatSpellTooltip({
        effectType: 'damage',
        range: 'ranged',
        cost: 1,
        tags: ['fire', 'single-target']
      })
    ).toEqual([
      'Damage: fire',
      'Ranged range',
      'Cost: 1 turn lockout after cast'
    ])
  })

  it('describes debuff effects for ray of frost', () => {
    expect(
      formatSpellTooltip({
        effectType: 'debuff',
        range: 'ranged',
        cost: 1,
        tags: ['cold', 'slow', 'single-target']
      })
    ).toEqual([
      'Debuff: cold, slow',
      'Ranged range',
      'Cost: 1 turn lockout after cast'
    ])
  })

  it('describes buff spells', () => {
    expect(
      formatSpellTooltip({
        effectType: 'buff',
        range: 'self',
        cost: 1,
        tags: ['defense', 'arcane']
      })
    ).toEqual([
      'Buff: defense, arcane',
      'Self range',
      'Cost: 1 turn lockout after cast'
    ])
  })
})
