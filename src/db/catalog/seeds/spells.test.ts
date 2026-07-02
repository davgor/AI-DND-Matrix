import { describe, expect, it } from 'vitest'
import { createTestDb } from '../../testUtils'
import { importSpellSeeds } from '../importPipeline'
import { listAllSpells, listSpellsByBucket } from '../spells'
import { SPELL_SEEDS_V1 } from './spells'

describe('spell/ability preseed dataset v1', () => {
  it('covers every seed archetype', () => {
    const archetypes = new Set(SPELL_SEEDS_V1.map((seed) => seed.archetypeHint))
    expect(archetypes).toEqual(new Set(['mage', 'cleric', 'rogue', 'fighter', 'ranger']))
  })

  it('has unique keys across the dataset', () => {
    const keys = SPELL_SEEDS_V1.map((seed) => seed.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('includes buff, debuff, and mixed-range starters', () => {
    const effectTypes = new Set(SPELL_SEEDS_V1.map((seed) => seed.effectType))
    expect(effectTypes).toEqual(
      new Set(['buff', 'control', 'damage', 'debuff', 'healing', 'utility'])
    )
    const ranges = new Set(SPELL_SEEDS_V1.map((seed) => seed.range))
    expect(ranges).toEqual(new Set(['melee', 'medium', 'ranged', 'self', 'touch']))
  })

  it('every entry has effect type, range, cost, tags, and constraints', () => {
    for (const seed of SPELL_SEEDS_V1) {
      expect(seed.effectType).toBeTruthy()
      expect(seed.range).toBeTruthy()
      expect(seed.cost).toBeGreaterThanOrEqual(0)
      expect(seed.tags.length).toBeGreaterThan(0)
      expect(seed.constraints.requiresArchetype?.length).toBeGreaterThan(0)
    }
  })

  it('imports without validation errors and can be filtered by bucket', () => {
    const db = createTestDb()
    const result = importSpellSeeds(db, SPELL_SEEDS_V1)

    expect(result.errors).toEqual([])
    expect(listAllSpells(db)).toHaveLength(SPELL_SEEDS_V1.length)
    expect(listSpellsByBucket(db, 'undead').map((s) => s.key).sort()).toEqual(
      ['bane', 'chill-touch', 'guiding-bolt', 'sacred-flame', 'turn-undead'].sort()
    )
  })

  it('re-importing the dataset does not duplicate rows', () => {
    const db = createTestDb()
    importSpellSeeds(db, SPELL_SEEDS_V1)
    importSpellSeeds(db, SPELL_SEEDS_V1)

    expect(listAllSpells(db)).toHaveLength(SPELL_SEEDS_V1.length)
  })
})
