import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { getCreatureByKey, listAllCreatures } from './creatures'
import { importCreatureSeeds, importSpellSeeds } from './importPipeline'
import { getSpellByKey } from './spells'
import type { CreateCatalogCreatureInput, CreateCatalogSpellInput } from './types'

const VALID_CREATURE: CreateCatalogCreatureInput = {
  key: 'test-goblin-scout',
  name: 'Goblin Scout',
  archetypeHint: 'rogue',
  levelMin: 1,
  levelMax: 3,
  hp: 7,
  ac: 14,
  abilities: { body: 8, agility: 14, mind: 10, presence: 8 },
  resistances: {},
  damageTypes: ['physical'],
  tags: ['raider'],
  buckets: ['goblinoid'],
  temperament: 'cunning',
  canSpeak: true,
  source: 'seed',
  version: 1
}

const VALID_SPELL: CreateCatalogSpellInput = {
  key: 'test-firebolt',
  name: 'Test Firebolt',
  effectType: 'damage',
  range: 'ranged',
  cost: 1,
  archetypeHint: 'mage',
  tags: ['fire'],
  buckets: ['elemental'],
  constraints: { requiresArchetype: ['mage'] },
  source: 'seed',
  version: 1
}

describe('catalog import pipeline: creatures', () => {
  it('imports valid seeds and reports no errors', () => {
    const db = createTestDb()
    const result = importCreatureSeeds(db, [VALID_CREATURE])

    expect(result.imported).toEqual(['test-goblin-scout'])
    expect(result.errors).toEqual([])
    expect(getCreatureByKey(db, 'test-goblin-scout')).toBeDefined()
  })

  it('is idempotent across repeated imports of the same seed file', () => {
    const db = createTestDb()
    importCreatureSeeds(db, [VALID_CREATURE])
    importCreatureSeeds(db, [VALID_CREATURE])

    const matches = listAllCreatures(db).filter((c) => c.key === 'test-goblin-scout')
    expect(matches).toHaveLength(1)
  })

  it('supports partial updates without duplicating canonical entries', () => {
    const db = createTestDb()
    importCreatureSeeds(db, [VALID_CREATURE])
    importCreatureSeeds(db, [{ ...VALID_CREATURE, hp: 9 }])

    const matches = listAllCreatures(db).filter((c) => c.key === 'test-goblin-scout')
    expect(matches).toHaveLength(1)
    expect(matches[0].hp).toBe(9)
  })

  it('rejects malformed entries with an actionable error and imports the rest', () => {
    const db = createTestDb()
    const malformed = { ...VALID_CREATURE, key: 'bad', buckets: ['not-a-bucket'] } as unknown as CreateCatalogCreatureInput

    const result = importCreatureSeeds(db, [VALID_CREATURE, malformed])

    expect(result.imported).toEqual(['test-goblin-scout'])
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatchObject({ key: 'bad' })
    expect(result.errors[0].reason).toMatch(/bucket/i)
    expect(getCreatureByKey(db, 'bad')).toBeUndefined()
  })

  it('rejects entries missing required fields', () => {
    const db = createTestDb()
    const missingHp = { ...VALID_CREATURE, key: 'no-hp', hp: 0 }

    const result = importCreatureSeeds(db, [missingHp])
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].reason).toMatch(/hp/i)
  })
})

describe('catalog import pipeline: spells', () => {
  it('imports valid seeds idempotently', () => {
    const db = createTestDb()
    importSpellSeeds(db, [VALID_SPELL])
    const result = importSpellSeeds(db, [VALID_SPELL])

    expect(result.imported).toEqual(['test-firebolt'])
    expect(getSpellByKey(db, 'test-firebolt')).toBeDefined()
  })

  it('rejects malformed spell entries', () => {
    const db = createTestDb()
    const malformed = { ...VALID_SPELL, key: 'bad-spell', cost: -1 }

    const result = importSpellSeeds(db, [malformed])
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].reason).toMatch(/cost/i)
    expect(getSpellByKey(db, 'bad-spell')).toBeUndefined()
  })
})
