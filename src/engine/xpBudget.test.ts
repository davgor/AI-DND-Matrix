import { describe, expect, it } from 'vitest'
import { clampXPProposal, resolveXPBudget } from './xpBudget'
import type { XPContext } from '../shared/progression/types'

const wolfFoe = {
  npcId: 'w1',
  npcRole: 'wolf',
  combatTier: 'catalog' as const,
  buckets: ['beast' as const],
  outcome: 'slain' as const
}

const banditFoe = {
  npcId: 'b1',
  npcRole: 'bandit',
  combatTier: 'villager' as const,
  buckets: ['humanoid' as const],
  outcome: 'slain' as const
}

function encounterContext(foes: XPContext['foes'], playerLevel: number): XPContext {
  return {
    source: 'encounter_end',
    foes,
    regionId: 'r1',
    playerLevel,
    playerCharacterId: 'c1',
    campaignId: 'camp1',
    roundCount: 2
  }
}

describe('resolveXPBudget', () => {
  it('wolf pack at level 1 yields non-zero band', () => {
    const budget = resolveXPBudget(encounterContext([wolfFoe], 1))
    expect(budget.min).toBeGreaterThan(0)
    expect(budget.max).toBeGreaterThanOrEqual(budget.min)
    expect(budget.suggested).toBeGreaterThan(0)
  })

  it('same wolf encounter at level 10 yields lower relative band', () => {
    const low = resolveXPBudget(encounterContext([wolfFoe], 1))
    const high = resolveXPBudget(encounterContext([wolfFoe], 10))
    expect(high.max).toBeLessThan(low.max)
  })

  it('major quest complete band exceeds routine bandit skirmish at same level', () => {
    const quest: XPContext = {
      source: 'quest_complete',
      foes: [],
      regionId: 'r1',
      playerLevel: 3,
      playerCharacterId: 'c1',
      campaignId: 'camp1',
      questScale: 'major'
    }
    const bandit = resolveXPBudget(encounterContext([banditFoe], 3))
    const majorQuest = resolveXPBudget(quest)
    expect(majorQuest.max).toBeGreaterThan(bandit.max)
  })

  it('returns zero band when nothing earned', () => {
    const fled = encounterContext([{ ...wolfFoe, outcome: 'flee' }], 2)
    expect(resolveXPBudget(fled)).toEqual({ min: 0, max: 0, suggested: 0 })
    expect(resolveXPBudget(encounterContext([], 2))).toEqual({ min: 0, max: 0, suggested: 0 })
  })
})

describe('clampXPProposal', () => {
  const budget = { min: 40, max: 80, suggested: 60 }

  it('clamps above max without rejecting', () => {
    const result = clampXPProposal(500, budget)
    expect(result.amount).toBe(80)
    expect(result.clamped).toBe(true)
  })

  it('clamps below min', () => {
    const result = clampXPProposal(5, budget)
    expect(result.amount).toBe(40)
    expect(result.clamped).toBe(true)
  })

  it('passes through in-range values', () => {
    const result = clampXPProposal(55, budget)
    expect(result).toEqual({ amount: 55, clamped: false })
  })
})
