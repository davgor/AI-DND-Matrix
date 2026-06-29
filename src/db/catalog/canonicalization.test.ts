import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { canonicalizeGeneratedCreature } from './canonicalization'
import { getCreatureByKey } from './creatures'
import type { CreateCatalogCreatureInput } from './types'

const GENERATED_OGRE: CreateCatalogCreatureInput = {
  key: 'swamp-ogre-brute',
  name: 'Swamp Ogre Brute',
  archetypeHint: 'fighter',
  levelMin: 3,
  levelMax: 6,
  hp: 30,
  ac: 13,
  abilities: { body: 16, agility: 8, mind: 6, presence: 8 },
  resistances: {},
  damageTypes: ['physical'],
  tags: ['brute'],
  buckets: ['humanoid'],
  temperament: 'aggressive',
  canSpeak: false,
  source: 'generated',
  provenance: { generatedFrom: 'encounter draft for the sunken bog scene' },
  version: 1
}

describe('catalog canonicalization workflow', () => {
  it('promotes a generated creature into the catalog with preserved provenance', () => {
    const db = createTestDb()
    const result = canonicalizeGeneratedCreature(db, GENERATED_OGRE)

    expect(result.promoted).toBe(true)
    expect(result.creature.source).toBe('generated-promoted')
    expect(result.creature.provenance?.generatedFrom).toBe(
      'encounter draft for the sunken bog scene'
    )
    expect(getCreatureByKey(db, 'swamp-ogre-brute')).toBeDefined()
  })

  it('refuses to promote a near-duplicate of an existing canonical entry', () => {
    const db = createTestDb()
    const nearDuplicate: CreateCatalogCreatureInput = {
      ...GENERATED_OGRE,
      key: 'goblin-scoutt',
      name: 'Goblin  Scout',
      buckets: ['goblinoid']
    }

    const result = canonicalizeGeneratedCreature(db, nearDuplicate)

    expect(result.promoted).toBe(false)
    expect(result.reason).toMatch(/duplicate/i)
    expect(getCreatureByKey(db, 'goblin-scoutt')).toBeUndefined()
  })
})
