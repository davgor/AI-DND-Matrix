import { describe, expect, it } from 'vitest'
import type { BestiaryVariantKey, CompositionSlot } from '../shared/bestiary/types'
import {
  compositionCost,
  encounterBudget,
  planEncounterComposition
} from './encounterComposition'

const VARIANT_COST: Record<BestiaryVariantKey, number> = {
  standard: 1,
  pack_runt: 1,
  alpha: 2,
  elite: 2,
  cursed: 2,
  mutated: 2
}

function totalCost(slots: CompositionSlot[]): number {
  return slots.reduce((sum, s) => sum + VARIANT_COST[s.variantKey] * s.count, 0)
}

function totalBodies(slots: CompositionSlot[]): number {
  return slots.reduce((sum, s) => sum + s.count, 0)
}

function countVariant(slots: CompositionSlot[], key: BestiaryVariantKey): number {
  return slots.filter((s) => s.variantKey === key).reduce((sum, s) => sum + s.count, 0)
}

describe('encounterBudget', () => {
  it('scales with player level and party size', () => {
    expect(encounterBudget(5, 1)).toBe(4)
    expect(encounterBudget(1, 1)).toBe(2)
    expect(encounterBudget(10, 3)).toBe(8)
  })

  it('clamps to min 1 and max 8', () => {
    expect(encounterBudget(0, 0)).toBe(1)
    expect(encounterBudget(-5, -2)).toBe(1)
    expect(encounterBudget(20, 10)).toBe(8)
  })
})

describe('planEncounterComposition — wolf pack', () => {
  it('level-5 wolf pack — multiple standard + one alpha within budget', () => {
    const plan = planEncounterComposition({
      playerLevel: 5,
      partySize: 1,
      speciesKey: 'wolf'
    })
    const budget = encounterBudget(5, 1)
    expect(plan.budgetMax).toBe(budget)
    expect(plan.budgetSpent).toBeLessThanOrEqual(plan.budgetMax)
    expect(plan.slots.every((s) => s.speciesKey === 'wolf')).toBe(true)
    expect(countVariant(plan.slots, 'standard')).toBeGreaterThanOrEqual(2)
    expect(countVariant(plan.slots, 'alpha')).toBe(1)
    expect(totalCost(plan.slots)).toBeLessThanOrEqual(budget)
    expect(compositionCost(plan.slots)).toBe(totalCost(plan.slots))
    expect(plan.budgetSpent).toBe(compositionCost(plan.slots))
  })
})

describe('planEncounterComposition — thematic signals', () => {
  it('cursed-land signal — prefers cursed mix over larger normal pack', () => {
    const normal = planEncounterComposition({
      playerLevel: 5,
      partySize: 1,
      speciesKey: 'wolf',
      thematicSignal: 'none'
    })
    const cursed = planEncounterComposition({
      playerLevel: 5,
      partySize: 1,
      speciesKey: 'wolf',
      thematicSignal: 'cursed'
    })
    expect(countVariant(cursed.slots, 'cursed')).toBeGreaterThanOrEqual(1)
    expect(countVariant(cursed.slots, 'standard')).toBe(0)
    expect(countVariant(cursed.slots, 'alpha')).toBe(0)
    expect(totalBodies(cursed.slots)).toBeLessThan(totalBodies(normal.slots))
    expect(compositionCost(cursed.slots)).toBeLessThanOrEqual(cursed.budgetMax)
    expect(cursed.thematicSignal).toBe('cursed')
  })

  it('blight and rift signals also prefer thematic variants', () => {
    for (const signal of ['blight', 'rift'] as const) {
      const plan = planEncounterComposition({
        playerLevel: 5,
        partySize: 1,
        speciesKey: 'wolf',
        thematicSignal: signal
      })
      const thematic = countVariant(plan.slots, 'cursed') + countVariant(plan.slots, 'mutated')
      expect(thematic).toBeGreaterThanOrEqual(1)
      expect(compositionCost(plan.slots)).toBeLessThanOrEqual(plan.budgetMax)
      expect(plan.thematicSignal).toBe(signal)
    }
  })
})

describe('planEncounterComposition — budget clamps', () => {
  it('budget clamps always enforced for any level/party size', () => {
    const cases = [
      { playerLevel: 1, partySize: 1 },
      { playerLevel: 5, partySize: 2 },
      { playerLevel: 12, partySize: 4 },
      { playerLevel: 20, partySize: 8 },
      { playerLevel: 0, partySize: 0 }
    ]
    for (const input of cases) {
      const plan = planEncounterComposition({ ...input, speciesKey: 'wolf' })
      expect(plan.budgetMax).toBeGreaterThanOrEqual(1)
      expect(plan.budgetMax).toBeLessThanOrEqual(8)
      expect(plan.budgetSpent).toBeLessThanOrEqual(plan.budgetMax)
      expect(compositionCost(plan.slots)).toBeGreaterThanOrEqual(1)
    }
  })
})
