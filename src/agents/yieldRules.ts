/**
 * 040.8: rules-first yield decisions. A pure decision table over
 * temperament + combat tier + lethality + allowed outcomes replaces the LLM
 * as the default path; the LLM is consulted only when the table returns
 * `ambiguous` (veteran-tier judgment calls).
 *
 * Hard invariants (enforced by `permittedYieldOutcomes`, not prompt guidance):
 * - never `slain` when lethality is `non_lethal` or mercy is offered
 *   (the table itself never proposes `slain` at all)
 * - the outcome is always within `allowedOutcomes` ∪ `fight_on`
 * - never `surrender` for `canSpeak: false`
 */
import type { Temperament } from '../shared/alignment/types'
import type { NpcYieldReviewOutcome, YieldReviewInput } from '../shared/npcCombat/types'

type YieldRuleDecision =
  | { kind: 'outcome'; outcome: NpcYieldReviewOutcome; narrationText: string }
  | { kind: 'ambiguous' }

interface YieldRuleRow {
  /** Row matches only when the attack lethality equals this value. */
  lethality?: 'lethal' | 'non_lethal'
  /** Row matches only when the NPC temperament is in this set. */
  temperaments?: readonly Temperament[]
  /** Row matches only when the NPC combat tier equals this value. */
  combatTier?: YieldReviewInput['combatTier']
  /** Row matches only when at least this many outcomes are allowed. */
  minAllowedOutcomes?: number
  /** Ordered outcome preferences, or defer to the LLM. */
  decide: readonly NpcYieldReviewOutcome[] | 'ambiguous'
}

/**
 * First matching row wins. Ordering intent:
 * 1. non-lethal intent always knocks out rather than anything grimmer
 * 2. mindless beasts flee; they cannot negotiate
 * 3. cowardly temperaments give up outright
 * 4. fanatic/aggressive temperaments never yield
 * 5. veterans weighing several options are a judgment call → LLM
 * 6. remaining temperaments and tiers have clear defaults
 */
const YIELD_RULES: readonly YieldRuleRow[] = [
  { lethality: 'non_lethal', decide: ['incapacitated', 'surrender', 'flee'] },
  { temperaments: ['mindless'], decide: ['flee', 'incapacitated', 'fight_on'] },
  { temperaments: ['skittish', 'cautious'], decide: ['surrender', 'flee', 'incapacitated'] },
  { temperaments: ['aggressive'], decide: ['fight_on'] },
  { combatTier: 'retired_adventurer', minAllowedOutcomes: 2, decide: 'ambiguous' },
  { temperaments: ['territorial'], decide: ['flee', 'incapacitated', 'fight_on'] },
  { temperaments: ['cunning'], decide: ['flee', 'surrender', 'incapacitated'] },
  { temperaments: ['disciplined'], decide: ['surrender', 'incapacitated', 'flee'] },
  { combatTier: 'villager', decide: ['surrender', 'flee', 'incapacitated'] },
  { decide: ['incapacitated', 'flee', 'surrender'] }
]

/** Last-resort preference order; `fight_on` is always permitted, so this is total. */
const FALLBACK_CHAIN: readonly NpcYieldReviewOutcome[] = ['incapacitated', 'flee', 'surrender', 'fight_on']

const YIELD_NARRATION_TEMPLATES: Record<NpcYieldReviewOutcome, (name: string) => string> = {
  surrender: (name) => `${name} drops their weapon and raises trembling hands in surrender.`,
  flee: (name) => `${name} breaks away and flees the fight.`,
  incapacitated: (name) => `${name} collapses, unconscious but alive.`,
  slain: (name) => `${name} falls and does not rise again.`,
  fight_on: (name) => `${name} refuses to yield and fights on.`
}

export function yieldNarrationTemplate(npcName: string, outcome: NpcYieldReviewOutcome): string {
  return YIELD_NARRATION_TEMPLATES[outcome](npcName)
}

/**
 * The outcomes an NPC may actually end up with: `allowedOutcomes` ∪ `fight_on`,
 * minus invariant violations. Also used to clamp LLM output on the ambiguous path.
 */
export function permittedYieldOutcomes(input: YieldReviewInput): NpcYieldReviewOutcome[] {
  const permitted = input.allowedOutcomes.filter((outcome) => {
    if (outcome === 'slain' && (input.lethality === 'non_lethal' || input.playerOffersMercy)) {
      return false
    }
    return !(outcome === 'surrender' && !input.canSpeak)
  })
  return [...permitted, 'fight_on']
}

function rowMatches(row: YieldRuleRow, input: YieldReviewInput): boolean {
  if (row.lethality !== undefined && row.lethality !== input.lethality) {
    return false
  }
  if (row.temperaments !== undefined && !row.temperaments.includes(input.temperament)) {
    return false
  }
  if (row.combatTier !== undefined && row.combatTier !== input.combatTier) {
    return false
  }
  return !(row.minAllowedOutcomes !== undefined && input.allowedOutcomes.length < row.minAllowedOutcomes)
}

function pickFirstPermitted(
  preferences: readonly NpcYieldReviewOutcome[],
  permitted: readonly NpcYieldReviewOutcome[]
): NpcYieldReviewOutcome {
  const chain = [...preferences, ...FALLBACK_CHAIN]
  // fight_on is always permitted, so the chain always yields a result.
  return chain.find((outcome) => permitted.includes(outcome)) ?? 'fight_on'
}

/** Deterministic outcome used when the LLM path exhausts schema retries. */
export function fallbackYieldOutcome(input: YieldReviewInput): NpcYieldReviewOutcome {
  return pickFirstPermitted(FALLBACK_CHAIN, permittedYieldOutcomes(input))
}

export function evaluateYieldRules(input: YieldReviewInput): YieldRuleDecision {
  const permitted = permittedYieldOutcomes(input)
  for (const row of YIELD_RULES) {
    if (!rowMatches(row, input)) {
      continue
    }
    if (row.decide === 'ambiguous') {
      return { kind: 'ambiguous' }
    }
    const outcome = pickFirstPermitted(row.decide, permitted)
    return { kind: 'outcome', outcome, narrationText: yieldNarrationTemplate(input.npcName, outcome) }
  }
  const outcome = fallbackYieldOutcome(input)
  return { kind: 'outcome', outcome, narrationText: yieldNarrationTemplate(input.npcName, outcome) }
}
