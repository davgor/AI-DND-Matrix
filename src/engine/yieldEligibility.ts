import type { Temperament } from '../shared/alignment/types'
import type { NpcYieldOutcome } from '../shared/combat/types'
import type { NpcCombatTier } from '../shared/npcCombat/types'

export interface YieldEligibilityInput {
  combatTier: NpcCombatTier
  temperament: Temperament
  hp: number
  maxHp: number
  wouldKill: boolean
  canSpeak: boolean
}

export interface YieldEligibilityResult {
  yieldCheckRequired: boolean
  suggestedOutcomes: NpcYieldOutcome[]
}

const FLEE_INCAPACITATED: NpcYieldOutcome[] = ['flee', 'incapacitated']
const FULL_YIELD: NpcYieldOutcome[] = ['surrender', 'flee', 'incapacitated']
const DEATH_DOOR: NpcYieldOutcome[] = ['surrender', 'incapacitated']

function hpRatio(hp: number, maxHp: number): number {
  if (maxHp <= 0) {
    return 0
  }
  return hp / maxHp
}

function filterForSpeech(outcomes: NpcYieldOutcome[], canSpeak: boolean): NpcYieldOutcome[] {
  if (canSpeak) {
    return outcomes
  }
  return outcomes.filter((o) => o !== 'surrender')
}

function checkVillagerTier(
  hp: number,
  maxHp: number,
  wouldKill: boolean,
  canSpeak: boolean
): YieldEligibilityResult {
  const ratio = hpRatio(hp, maxHp)
  if (ratio <= 0.5 || wouldKill) {
    return { yieldCheckRequired: true, suggestedOutcomes: filterForSpeech(FULL_YIELD, canSpeak) }
  }
  return { yieldCheckRequired: false, suggestedOutcomes: [] }
}

function checkSkittishCautious(
  hp: number,
  maxHp: number,
  wouldKill: boolean,
  canSpeak: boolean
): YieldEligibilityResult {
  const ratio = hpRatio(hp, maxHp)
  if (ratio <= 0.5 || wouldKill) {
    return { yieldCheckRequired: true, suggestedOutcomes: filterForSpeech(FULL_YIELD, canSpeak) }
  }
  return { yieldCheckRequired: false, suggestedOutcomes: [] }
}

function checkAggressiveDisciplined(wouldKill: boolean, canSpeak: boolean): YieldEligibilityResult {
  if (wouldKill) {
    return { yieldCheckRequired: true, suggestedOutcomes: filterForSpeech(DEATH_DOOR, canSpeak) }
  }
  return { yieldCheckRequired: false, suggestedOutcomes: [] }
}

function checkMindless(wouldKill: boolean): YieldEligibilityResult {
  if (wouldKill) {
    return { yieldCheckRequired: true, suggestedOutcomes: FLEE_INCAPACITATED }
  }
  return { yieldCheckRequired: false, suggestedOutcomes: [] }
}

function checkRetiredAdventurer(
  hp: number,
  maxHp: number,
  wouldKill: boolean,
  canSpeak: boolean
): YieldEligibilityResult {
  const ratio = hpRatio(hp, maxHp)
  if (ratio <= 0.25 || wouldKill) {
    return { yieldCheckRequired: true, suggestedOutcomes: filterForSpeech(FULL_YIELD, canSpeak) }
  }
  return { yieldCheckRequired: false, suggestedOutcomes: [] }
}

function checkByTemperament(input: {
  temperament: Temperament
  hp: number
  maxHp: number
  wouldKill: boolean
  canSpeak: boolean
}): YieldEligibilityResult {
  const { temperament, hp, maxHp, wouldKill, canSpeak } = input
  switch (temperament) {
    case 'skittish':
    case 'cautious':
      return checkSkittishCautious(hp, maxHp, wouldKill, canSpeak)
    case 'aggressive':
    case 'disciplined':
      return checkAggressiveDisciplined(wouldKill, canSpeak)
    case 'mindless':
      return checkMindless(wouldKill)
    default:
      return checkAggressiveDisciplined(wouldKill, canSpeak)
  }
}

export function checkYieldEligibility(input: YieldEligibilityInput): YieldEligibilityResult {
  const { combatTier, temperament, hp, maxHp, wouldKill, canSpeak } = input

  switch (combatTier) {
    case 'villager':
      return checkVillagerTier(hp, maxHp, wouldKill, canSpeak)
    case 'retired_adventurer':
      return checkRetiredAdventurer(hp, maxHp, wouldKill, canSpeak)
    case 'catalog':
      return checkByTemperament({ temperament, hp, maxHp, wouldKill, canSpeak })
    default:
      return checkByTemperament({ temperament, hp, maxHp, wouldKill, canSpeak })
  }
}
