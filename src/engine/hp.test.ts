import { describe, expect, it } from 'vitest'
import { abilityModifier } from './abilities'
import { createSeededRandom } from './abilities'
import {
  CATALOG_MONSTER_MIN_MAX_HP,
  HIT_DIE_SIZE,
  applyLevelUpHitDice,
  computeCatalogMonsterHp,
  computeMaxHpFromHitDice,
  computeRetiredAdventurerHp,
  hashStringSeed,
  pickLevelInRange,
  rollInitialMaxHp,
  rollMaxHpForLevel
} from './hp'

describe('rollInitialMaxHp', () => {
  it('produces L1 HP within [1 + mod, dieSize + mod]', () => {
    const rng = createSeededRandom(42)
    const bodyScore = 14
    const mod = abilityModifier(bodyScore)
    const { maxHp } = rollInitialMaxHp('fighter', bodyScore, rng)
    expect(maxHp).toBeGreaterThanOrEqual(1 + mod)
    expect(maxHp).toBeLessThanOrEqual(HIT_DIE_SIZE.fighter + mod)
  })

  it('is deterministic for the same seed', () => {
    const rngA = createSeededRandom(99)
    const rngB = createSeededRandom(99)
    expect(rollInitialMaxHp('mage', 10, rngA)).toEqual(rollInitialMaxHp('mage', 10, rngB))
  })
})

describe('computeMaxHpFromHitDice', () => {
  it('sums rolls plus Body modifier once', () => {
    const bodyScore = 14
    const rolls = [6, 4, 8]
    expect(computeMaxHpFromHitDice(bodyScore, rolls)).toBe(6 + 4 + 8 + abilityModifier(bodyScore))
  })
})

describe('rollMaxHpForLevel', () => {
  it('stores one roll per level', () => {
    const rng = createSeededRandom(7)
    const { hitDieRolls } = rollMaxHpForLevel('rogue', 4, 12, rng)
    expect(hitDieRolls).toHaveLength(4)
  })
})

describe('applyLevelUpHitDice', () => {
  it('awards exactly one die per level gained', () => {
    const rng = createSeededRandom(3)
    const existing = [7]
    const result = applyLevelUpHitDice({ archetype: 'fighter', bodyScore: 14, existingRolls: existing, levelsGained: 1, rng })
    expect(result.hitDieRolls).toHaveLength(2)
    expect(result.hpGain).toBe(result.hitDieRolls[1])
  })

  it('awards four dice for a four-level jump', () => {
    const rng = createSeededRandom(5)
    const result = applyLevelUpHitDice({ archetype: 'cleric', bodyScore: 12, existingRolls: [5], levelsGained: 4, rng })
    expect(result.hitDieRolls).toHaveLength(5)
    expect(result.hpGain).toBe(result.hitDieRolls.slice(1).reduce((a, b) => a + b, 0))
  })
})

describe('fighter vs mage distributions', () => {
  it('fighter d10 produces higher ceiling than mage d6 for the same seed', () => {
    const body = 10
    const fighter = rollMaxHpForLevel('fighter', 1, body, createSeededRandom(123))
    const mage = rollMaxHpForLevel('mage', 1, body, createSeededRandom(456))
    expect(HIT_DIE_SIZE.fighter).toBeGreaterThan(HIT_DIE_SIZE.mage)
    expect(fighter.maxHp - abilityModifier(body)).toBeLessThanOrEqual(HIT_DIE_SIZE.fighter)
    expect(mage.maxHp - abilityModifier(body)).toBeLessThanOrEqual(HIT_DIE_SIZE.mage)
  })
})

describe('pickLevelInRange', () => {
  it('is stable for the same npc + catalog key', () => {
    expect(pickLevelInRange(1, 3, 'npc-1:goblin-scout')).toBe(pickLevelInRange(1, 3, 'npc-1:goblin-scout'))
  })
})

describe('computeCatalogMonsterHp bands', () => {
  it('never returns maxHp below the catalog floor', () => {
    const result = computeCatalogMonsterHp({
      npcId: 'g1',
      catalogKey: 'goblin-scout',
      archetypeHint: 'rogue',
      levelMin: 1,
      levelMax: 1,
      bodyScore: 8
    })
    expect(result.maxHp).toBeGreaterThanOrEqual(CATALOG_MONSTER_MIN_MAX_HP)
  })

  it('produces different bands for goblin L1 vs stone golem L6', () => {
    const goblin = computeCatalogMonsterHp({
      npcId: 'gob',
      catalogKey: 'goblin-scout',
      archetypeHint: 'rogue',
      levelMin: 1,
      levelMax: 1,
      bodyScore: 8
    })
    const golem = computeCatalogMonsterHp({
      npcId: 'golem',
      catalogKey: 'stone-golem',
      archetypeHint: 'fighter',
      levelMin: 6,
      levelMax: 6,
      bodyScore: 18
    })
    expect(golem.maxHp).toBeGreaterThan(goblin.maxHp)
    expect(goblin.hitDieRolls).toHaveLength(1)
    expect(golem.hitDieRolls).toHaveLength(6)
  })
})

describe('computeCatalogMonsterHp stability', () => {
  it('is stable across reloads for the same npc id and catalog key', () => {
    const params = {
      npcId: 'stable-npc',
      catalogKey: 'goblin-scout',
      levelMin: 1,
      levelMax: 3,
      bodyScore: 8
    }
    expect(computeCatalogMonsterHp(params)).toEqual(computeCatalogMonsterHp(params))
  })
})

describe('computeRetiredAdventurerHp', () => {
  it('is deterministic per npc id and profile', () => {
    const a = computeRetiredAdventurerHp('npc-a', 'brawler')
    const b = computeRetiredAdventurerHp('npc-a', 'brawler')
    expect(b).toEqual(a)
    expect(a.maxHp).toBeGreaterThan(10)
  })
})

describe('hashStringSeed', () => {
  it('returns a stable unsigned 32-bit value', () => {
    expect(hashStringSeed('test')).toBe(hashStringSeed('test'))
    expect(hashStringSeed('test')).toBeGreaterThanOrEqual(0)
  })
})
