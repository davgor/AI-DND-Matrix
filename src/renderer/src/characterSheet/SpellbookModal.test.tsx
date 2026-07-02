import { describe, expect, it } from 'vitest'
import type { KnownSpellView } from '../../../shared/spells/types'
import { resolveKnownSpells } from '../../../engine/knownSpells'

function fixtureSpell(name: string, cost: number): KnownSpellView {
  return {
    catalogKey: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    effectType: 'damage',
    range: 'ranged',
    cost,
    tags: ['fire'],
    constraintsHint: 'Mage · level 1+',
    rulesText: `${name} rules`
  }
}

describe('SpellbookModal fixtures', () => {
  it('supports two known spells for modal cards', () => {
    const spells = [fixtureSpell('Firebolt', 1), fixtureSpell('Frost Shard', 2)]
    expect(spells).toHaveLength(2)
    expect(spells[0]?.cost).toBe(1)
    expect(spells[1]?.name).toBe('Frost Shard')
  })

  it('empty known spell list matches empty state copy contract', () => {
    expect(resolveKnownSpells([], () => undefined)).toEqual([])
  })
})
