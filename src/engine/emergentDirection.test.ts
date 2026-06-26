import { describe, expect, it } from 'vitest'
import { detectEmergentDirection } from './emergentDirection'

describe('detectEmergentDirection', () => {
  const fighter = { kitTags: ['melee', 'martial'] }

  it('returns null when no tag crosses the threshold', () => {
    const events = [{ tag: 'arcane' }, { tag: 'arcane' }, { tag: 'melee' }]
    expect(detectEmergentDirection(fighter, events)).toBeNull()
  })

  it('returns a candidate once a tag crosses the threshold', () => {
    const events = [{ tag: 'arcane' }, { tag: 'arcane' }, { tag: 'arcane' }, { tag: 'melee' }]
    expect(detectEmergentDirection(fighter, events)).toEqual({ tag: 'arcane', count: 3 })
  })

  it('ignores tags that are already part of the archetype kit', () => {
    const events = [{ tag: 'melee' }, { tag: 'melee' }, { tag: 'melee' }]
    expect(detectEmergentDirection(fighter, events)).toBeNull()
  })
})
