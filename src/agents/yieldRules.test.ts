import { describe, expect, it } from 'vitest'
import {
  evaluateYieldRules,
  fallbackYieldOutcome,
  permittedYieldOutcomes,
  yieldNarrationTemplate
} from './yieldRules'
import { NPC_YIELD_OUTCOMES, type NpcYieldOutcome } from '../shared/combat/types'
import { ATTACK_LETHALITIES, NPC_COMBAT_TIERS, type YieldReviewInput } from '../shared/npcCombat/types'
import { TEMPERAMENTS } from '../shared/alignment/types'

function makeInput(overrides: Partial<YieldReviewInput> = {}): YieldReviewInput {
  return {
    npcName: 'Elara',
    npcRole: 'farmer',
    alignment: 'true_neutral',
    temperament: 'neutral',
    canSpeak: true,
    combatTier: 'villager',
    backstory: 'A simple farmer.',
    hp: 3,
    maxHp: 8,
    lethality: 'lethal',
    playerOffersMercy: false,
    allowedOutcomes: ['surrender', 'flee', 'incapacitated'],
    ...overrides
  }
}

describe('evaluateYieldRules: cowardly surrender', () => {
  it('skittish speaking NPC surrenders', () => {
    const decision = evaluateYieldRules(makeInput({ temperament: 'skittish' }))
    expect(decision).toEqual({
      kind: 'outcome',
      outcome: 'surrender',
      narrationText: yieldNarrationTemplate('Elara', 'surrender')
    })
  })

  it('cautious speaking NPC surrenders', () => {
    const decision = evaluateYieldRules(makeInput({ temperament: 'cautious' }))
    expect(decision).toMatchObject({ kind: 'outcome', outcome: 'surrender' })
  })
})

describe('evaluateYieldRules: beast flee', () => {
  it('mindless creature flees rather than surrendering', () => {
    const decision = evaluateYieldRules(
      makeInput({ temperament: 'mindless', canSpeak: false, combatTier: 'catalog', allowedOutcomes: ['flee', 'incapacitated'] })
    )
    expect(decision).toMatchObject({ kind: 'outcome', outcome: 'flee' })
  })

  it('skittish non-speaking creature flees (surrender filtered by canSpeak invariant)', () => {
    const decision = evaluateYieldRules(
      makeInput({ temperament: 'skittish', canSpeak: false, combatTier: 'catalog' })
    )
    expect(decision).toMatchObject({ kind: 'outcome', outcome: 'flee' })
  })
})

describe('evaluateYieldRules: fanatic fight_on', () => {
  it('aggressive temperament fights on even at deaths door', () => {
    const decision = evaluateYieldRules(
      makeInput({
        temperament: 'aggressive',
        combatTier: 'catalog',
        hp: 0,
        maxHp: 12,
        allowedOutcomes: ['surrender', 'incapacitated']
      })
    )
    expect(decision).toMatchObject({ kind: 'outcome', outcome: 'fight_on' })
  })

  it('aggressive fanatic refuses even offered mercy', () => {
    const decision = evaluateYieldRules(
      makeInput({ temperament: 'aggressive', combatTier: 'catalog', playerOffersMercy: true })
    )
    expect(decision).toMatchObject({ kind: 'outcome', outcome: 'fight_on' })
  })
})

describe('evaluateYieldRules: non-lethal incapacitated', () => {
  it('non-lethal attack prefers incapacitated regardless of temperament', () => {
    const decision = evaluateYieldRules(
      makeInput({ temperament: 'skittish', lethality: 'non_lethal', allowedOutcomes: ['incapacitated'] })
    )
    expect(decision).toMatchObject({ kind: 'outcome', outcome: 'incapacitated' })
  })
})

describe('evaluateYieldRules: villager tier', () => {
  it('neutral-temperament villager surrenders at threshold', () => {
    const decision = evaluateYieldRules(makeInput())
    expect(decision).toMatchObject({ kind: 'outcome', outcome: 'surrender' })
  })
})

describe('evaluateYieldRules: veteran ambiguity', () => {
  it('retired adventurer with multiple allowed outcomes is ambiguous (LLM decides)', () => {
    const decision = evaluateYieldRules(
      makeInput({ combatTier: 'retired_adventurer', temperament: 'neutral' })
    )
    expect(decision).toEqual({ kind: 'ambiguous' })
  })

  it('retired adventurer with a single allowed outcome is decided without the LLM', () => {
    const decision = evaluateYieldRules(
      makeInput({ combatTier: 'retired_adventurer', temperament: 'neutral', allowedOutcomes: ['flee'] })
    )
    expect(decision).toMatchObject({ kind: 'outcome', outcome: 'flee' })
  })

  it('clear-cut temperaments still bypass the veteran ambiguity row', () => {
    const decision = evaluateYieldRules(
      makeInput({ combatTier: 'retired_adventurer', temperament: 'skittish' })
    )
    expect(decision).toMatchObject({ kind: 'outcome', outcome: 'surrender' })
  })
})

describe('yield narration templates', () => {
  it('produces a non-empty template naming the NPC for every outcome', () => {
    for (const outcome of [...NPC_YIELD_OUTCOMES, 'fight_on'] as const) {
      const text = yieldNarrationTemplate('Grask', outcome)
      expect(text.length).toBeGreaterThan(0)
      expect(text).toContain('Grask')
    }
  })
})

describe('permittedYieldOutcomes', () => {
  it('always includes fight_on', () => {
    expect(permittedYieldOutcomes(makeInput({ allowedOutcomes: [] }))).toContain('fight_on')
  })

  it('drops slain when lethality is non_lethal', () => {
    const permitted = permittedYieldOutcomes(
      makeInput({ lethality: 'non_lethal', allowedOutcomes: ['slain', 'incapacitated'] })
    )
    expect(permitted).not.toContain('slain')
  })

  it('drops slain when mercy is offered', () => {
    const permitted = permittedYieldOutcomes(
      makeInput({ playerOffersMercy: true, allowedOutcomes: ['slain', 'incapacitated'] })
    )
    expect(permitted).not.toContain('slain')
  })

  it('drops surrender when the NPC cannot speak', () => {
    const permitted = permittedYieldOutcomes(makeInput({ canSpeak: false }))
    expect(permitted).not.toContain('surrender')
  })
})

function nonEmptyOutcomeSubsets(): NpcYieldOutcome[][] {
  const subsets: NpcYieldOutcome[][] = []
  for (let mask = 1; mask < 1 << NPC_YIELD_OUTCOMES.length; mask += 1) {
    subsets.push(NPC_YIELD_OUTCOMES.filter((_, index) => mask & (1 << index)))
  }
  return subsets
}

function enumerateYieldInputs(): YieldReviewInput[] {
  const booleans = [true, false]
  return TEMPERAMENTS.flatMap((temperament) =>
    NPC_COMBAT_TIERS.flatMap((combatTier) =>
      ATTACK_LETHALITIES.flatMap((lethality) =>
        booleans.flatMap((playerOffersMercy) =>
          booleans.flatMap((canSpeak) =>
            nonEmptyOutcomeSubsets().map((allowedOutcomes) =>
              makeInput({ temperament, combatTier, lethality, playerOffersMercy, canSpeak, allowedOutcomes })
            )
          )
        )
      )
    )
  )
}

describe('yield rules hard invariants (property-style, full input space)', () => {
  it('every decided cell honors the slain/surrender/allowed invariants', () => {
    for (const input of enumerateYieldInputs()) {
      const decision = evaluateYieldRules(input)
      if (decision.kind === 'ambiguous') {
        continue
      }
      const allowed: readonly string[] = [...input.allowedOutcomes, 'fight_on']
      expect(allowed).toContain(decision.outcome)
      if (input.lethality === 'non_lethal' || input.playerOffersMercy) {
        expect(decision.outcome).not.toBe('slain')
      }
      if (!input.canSpeak) {
        expect(decision.outcome).not.toBe('surrender')
      }
      expect(decision.narrationText.length).toBeGreaterThan(0)
    }
  })

  it('the parse-failure fallback honors the same invariants for every cell', () => {
    for (const input of enumerateYieldInputs()) {
      const outcome = fallbackYieldOutcome(input)
      expect([...input.allowedOutcomes, 'fight_on']).toContain(outcome)
      expect(outcome).not.toBe('slain')
      if (!input.canSpeak) {
        expect(outcome).not.toBe('surrender')
      }
    }
  })
})
