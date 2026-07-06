import { describe, expect, it } from 'vitest'
import {
  DIFFICULTY_XP_SPAN_FRACTION,
  difficultyXpNarration,
  fallbackDifficulty,
  resolveDifficultyXP,
  shouldSkipXpPass
} from './difficultyXp'
import { LEVEL_XP_THRESHOLDS, MAX_LEVEL } from './xp'
import { ENCOUNTER_DIFFICULTIES } from '../shared/progression/types'
import type { XPContext, XpFoeSummary } from '../shared/progression/types'

function encounterContext(foes: XpFoeSummary[], playerLevel: number): XPContext {
  return {
    source: 'encounter_end',
    foes,
    regionId: 'r1',
    playerLevel,
    playerCharacterId: 'c1',
    campaignId: 'camp1'
  }
}

const slainWolf: XpFoeSummary = {
  npcId: 'n1',
  npcRole: 'predator',
  combatTier: 'catalog',
  buckets: ['beast'],
  outcome: 'slain'
}

const fledWolf: XpFoeSummary = { ...slainWolf, outcome: 'flee' }

describe('resolveDifficultyXP', () => {
  it('is a fixed fraction of the current level-up span', () => {
    // Level 1 span is 300 (0 -> 300): medium = 10% = 30
    expect(resolveDifficultyXP('medium', 1)).toBe(30)
    expect(resolveDifficultyXP('easy', 1)).toBe(15)
    expect(resolveDifficultyXP('hard', 1)).toBe(60)
    expect(resolveDifficultyXP('extreme', 1)).toBe(105)
    expect(resolveDifficultyXP('impossible', 1)).toBe(180)
  })

  it('is strictly monotonic in difficulty at every level', () => {
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      const amounts = ENCOUNTER_DIFFICULTIES.map((d) => resolveDifficultyXP(d, level))
      for (let i = 1; i < amounts.length; i += 1) {
        expect(amounts[i]).toBeGreaterThan(amounts[i - 1])
      }
    }
  })

  it('scales with the level span so pacing is level-independent', () => {
    // Level 5 span is 14000 - 6500 = 7500: medium = 750
    expect(resolveDifficultyXP('medium', 5)).toBe(750)
  })

  it('uses the final threshold gap at max level and stays positive', () => {
    const lastSpan =
      LEVEL_XP_THRESHOLDS[LEVEL_XP_THRESHOLDS.length - 1] -
      LEVEL_XP_THRESHOLDS[LEVEL_XP_THRESHOLDS.length - 2]
    expect(resolveDifficultyXP('medium', MAX_LEVEL)).toBe(Math.floor(lastSpan * 0.1))
    expect(resolveDifficultyXP('easy', MAX_LEVEL)).toBeGreaterThan(0)
  })

  it('never awards less than 1 XP', () => {
    expect(resolveDifficultyXP('easy', 1)).toBeGreaterThanOrEqual(1)
  })

  it('covers every difficulty in the fraction table', () => {
    for (const difficulty of ENCOUNTER_DIFFICULTIES) {
      expect(DIFFICULTY_XP_SPAN_FRACTION[difficulty]).toBeGreaterThan(0)
      expect(DIFFICULTY_XP_SPAN_FRACTION[difficulty]).toBeLessThanOrEqual(1)
    }
  })
})

describe('fallbackDifficulty', () => {
  it('defaults to medium for encounters', () => {
    expect(fallbackDifficulty(encounterContext([slainWolf], 2))).toBe('medium')
  })

  it('defaults to hard for major quests', () => {
    const ctx: XPContext = {
      ...encounterContext([], 2),
      source: 'quest_complete',
      questScale: 'major'
    }
    expect(fallbackDifficulty(ctx)).toBe('hard')
  })

  it('defaults to medium for minor quests', () => {
    const ctx: XPContext = {
      ...encounterContext([], 2),
      source: 'quest_complete',
      questScale: 'minor'
    }
    expect(fallbackDifficulty(ctx)).toBe('medium')
  })
})

describe('shouldSkipXpPass', () => {
  it('skips encounters with zero XP-earning foes', () => {
    expect(shouldSkipXpPass(encounterContext([fledWolf], 2))).toBe(true)
    expect(shouldSkipXpPass(encounterContext([], 2))).toBe(true)
  })

  it('does not skip encounters with earning foes', () => {
    expect(shouldSkipXpPass(encounterContext([slainWolf], 2))).toBe(false)
  })

  it('never skips quest completion', () => {
    const ctx: XPContext = { ...encounterContext([], 2), source: 'quest_complete' }
    expect(shouldSkipXpPass(ctx)).toBe(false)
  })
})

describe('difficultyXpNarration', () => {
  it('produces a non-empty template for every difficulty and source', () => {
    for (const difficulty of ENCOUNTER_DIFFICULTIES) {
      expect(difficultyXpNarration(difficulty, 'encounter_end').length).toBeGreaterThan(0)
      expect(difficultyXpNarration(difficulty, 'quest_complete').length).toBeGreaterThan(0)
    }
  })
})
