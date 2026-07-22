import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter, getCharacterById, updateCharacter } from '../db/repositories/characters'
import {
  applyCatalogSpellLockout,
  intentConsumesAction,
  tryBlockLockedAction
} from './turnLockoutPlay'
import type { IntentInterpretation } from '../agents/dm'
import type { Character } from '../db/repositories/characters'
import type Database from 'better-sqlite3'

function baseIntent(partial: Partial<IntentInterpretation> = {}): IntentInterpretation {
  return { checkNeeded: false, ...partial }
}

function createMage(
  db: Database.Database,
  stats: Record<string, unknown> = {}
): Character {
  const campaign = createCampaign(db, { name: 'L', premisePrompt: 'p', deathMode: 'legendary' })
  return createCharacter(db, {
    campaignId: campaign.id,
    name: 'Mage',
    characterClass: 'mage',
    kind: 'player',
    stats: { knownSpellKeys: ['firebolt'], ...stats }
  })
}

function lockoutRemaining(character: Character): number | undefined {
  return (character.stats as { actionLockoutTurnsRemaining?: number }).actionLockoutTurnsRemaining
}

describe('turnLockoutPlay intent classification', () => {
  it('treats combat and checks as Actions', () => {
    expect(intentConsumesAction(baseIntent({ combatIntent: 'attack' }))).toBe(true)
    expect(
      intentConsumesAction(baseIntent({ checkNeeded: true, ability: 'body', dc: 10, proficient: false }))
    ).toBe(true)
    expect(intentConsumesAction(baseIntent({ usedCatalogSpellKey: 'firebolt' }))).toBe(true)
    expect(intentConsumesAction(baseIntent())).toBe(false)
  })
})

describe('turnLockoutPlay cost-1 lockout', () => {
  it('blocks next Action after cost-1 cast then allows the following turn', () => {
    const db = createTestDb()
    const mage = createMage(db)

    expect(applyCatalogSpellLockout(db, mage, 'firebolt')).toBe(1)
    const locked = getCharacterById(db, mage.id)!
    expect(lockoutRemaining(locked)).toBe(1)

    const blocked = tryBlockLockedAction(db, locked, baseIntent({ combatIntent: 'attack' }))
    expect(blocked.blocked).toBe(true)
    if (blocked.blocked) {
      expect(blocked.message).toContain('cannot take an Action')
    }

    const afterBlock = getCharacterById(db, mage.id)!
    expect(lockoutRemaining(afterBlock)).toBe(0)
    expect(tryBlockLockedAction(db, afterBlock, baseIntent({ combatIntent: 'attack' })).blocked).toBe(false)
  })
})

describe('turnLockoutPlay multi-turn lockout', () => {
  it('holds multi-turn cost for N Action opportunities', () => {
    const db = createTestDb()
    let hero = createMage(db, { actionLockoutTurnsRemaining: 0 })
    updateCharacter(db, hero.id, {
      stats: { ...hero.stats, actionLockoutTurnsRemaining: 2, knownSpellKeys: ['firebolt'] }
    })
    hero = getCharacterById(db, hero.id)!
    expect(tryBlockLockedAction(db, hero, baseIntent({ combatIntent: 'attack' })).blocked).toBe(true)
    hero = getCharacterById(db, hero.id)!
    expect(lockoutRemaining(hero)).toBe(1)
    expect(tryBlockLockedAction(db, hero, baseIntent({ combatIntent: 'attack' })).blocked).toBe(true)
    hero = getCharacterById(db, hero.id)!
    expect(lockoutRemaining(hero)).toBe(0)
    expect(tryBlockLockedAction(db, hero, baseIntent({ combatIntent: 'attack' })).blocked).toBe(false)
  })
})

describe('turnLockoutPlay catalog authority', () => {
  it('ignores LLM-proposed durations by looking up catalog cost only', () => {
    const db = createTestDb()
    const hero = createMage(db)
    expect(applyCatalogSpellLockout(db, hero, 'not-known')).toBeNull()
    expect(applyCatalogSpellLockout(db, getCharacterById(db, hero.id)!, 'firebolt')).toBe(1)
  })
})
