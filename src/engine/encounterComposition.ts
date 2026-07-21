/**
 * Encounter composition budget + variant planner (pure engine).
 *
 * Budget formula: clamp(1, 8, partySize + floor(playerLevel / 2) + 1)
 * Variant costs: standard/pack_runt = 1; alpha/elite/cursed/mutated = 2
 */

import type {
  BestiaryVariantKey,
  CompositionPlan,
  CompositionSlot
} from '../shared/bestiary/types'

export type ThematicSignal = 'none' | 'cursed' | 'blight' | 'rift'

export interface CompositionInput {
  playerLevel: number
  /** PC + AI party members in the fight (min 1 for planning). */
  partySize: number
  speciesKey: string
  thematicSignal?: ThematicSignal
}

const MIN_BUDGET = 1
const MAX_BUDGET = 8
const CHEAP_COST = 1
const TOUGH_COST = 2

const VARIANT_COSTS: Record<BestiaryVariantKey, number> = {
  standard: CHEAP_COST,
  pack_runt: CHEAP_COST,
  alpha: TOUGH_COST,
  elite: TOUGH_COST,
  cursed: TOUGH_COST,
  mutated: TOUGH_COST
}

/** Engine-owned encounter points from level + party size. */
export function encounterBudget(playerLevel: number, partySize: number): number {
  const raw = partySize + Math.floor(playerLevel / 2) + 1
  return Math.max(MIN_BUDGET, Math.min(MAX_BUDGET, raw))
}

/** Total point cost of a composition (sum of variant cost × count). */
export function compositionCost(slots: CompositionSlot[]): number {
  return slots.reduce((sum, slot) => sum + VARIANT_COSTS[slot.variantKey] * slot.count, 0)
}

function slot(speciesKey: string, variantKey: BestiaryVariantKey, count: number): CompositionSlot {
  return { speciesKey, variantKey, count }
}

function thematicVariant(signal: ThematicSignal): BestiaryVariantKey {
  return signal === 'cursed' ? 'cursed' : 'mutated'
}

/** Standard pack: as many standards as budget allows, plus one alpha when affordable. */
function planNormalPack(speciesKey: string, budget: number): CompositionSlot[] {
  if (budget >= TOUGH_COST + 2 * CHEAP_COST) {
    const standards = budget - TOUGH_COST
    return [slot(speciesKey, 'standard', standards), slot(speciesKey, 'alpha', 1)]
  }
  return [slot(speciesKey, 'standard', budget)]
}

/**
 * Thematic pack: fewer tougher bodies (cost 2 each) instead of a larger normal pack.
 * Leftover odd budget point is unused so the pack stays smaller.
 */
function planThematicPack(
  speciesKey: string,
  budget: number,
  signal: ThematicSignal
): CompositionSlot[] {
  const count = Math.floor(budget / TOUGH_COST)
  if (count < 1) {
    return [slot(speciesKey, 'standard', MIN_BUDGET)]
  }
  return [slot(speciesKey, thematicVariant(signal), count)]
}

function isThematic(signal: ThematicSignal | undefined): signal is 'cursed' | 'blight' | 'rift' {
  return signal === 'cursed' || signal === 'blight' || signal === 'rift'
}

/** Deterministic composition within budget — no LLM. */
export function planEncounterComposition(input: CompositionInput): CompositionPlan {
  const budgetMax = encounterBudget(input.playerLevel, input.partySize)
  const signal = input.thematicSignal ?? 'none'
  const slots = isThematic(signal)
    ? planThematicPack(input.speciesKey, budgetMax, signal)
    : planNormalPack(input.speciesKey, budgetMax)
  const thematicSignal = signal === 'none' ? undefined : signal
  return {
    slots,
    budgetSpent: compositionCost(slots),
    budgetMax,
    ...(thematicSignal !== undefined ? { thematicSignal } : {})
  }
}
