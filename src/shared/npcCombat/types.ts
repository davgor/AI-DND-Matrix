import type { DamageRoll } from '../../engine/damage'
import type { Temperament } from '../alignment/types'
import { NPC_YIELD_OUTCOMES, type NpcYieldOutcome } from '../combat/types'

export const NPC_COMBAT_TIERS = ['villager', 'retired_adventurer', 'catalog'] as const
export type NpcCombatTier = (typeof NPC_COMBAT_TIERS)[number]

export const RETIRED_ADVENTURER_PROFILES = ['brawler', 'skirmisher', 'veteran'] as const
export type RetiredAdventurerProfile = (typeof RETIRED_ADVENTURER_PROFILES)[number]

export const DEFEAT_DISPOSITIONS = [
  'imprison',
  'bury_out_back',
  'leave_unconscious',
  'execute',
  'ransom',
  'mercy_release'
] as const
export type DefeatDisposition = (typeof DEFEAT_DISPOSITIONS)[number]

export interface NpcCombatStats {
  hp: number
  maxHp: number
  ac: number
  attackBonus: number
  damageRoll: DamageRoll
}

export interface NpcDefeatOutcome {
  disposition: DefeatDisposition
  victorNpcId: string
  locationTag?: string
  narrativeSummary: string
  resolvedAt: string
  imprisoned?: boolean
  buried?: boolean
  awaitingRansom?: boolean
}

export interface RetiredAdventurerReviewResult {
  upgrade: boolean
  profile?: RetiredAdventurerProfile
}

export interface DefeatDispositionProposal {
  disposition: DefeatDisposition
  narrationText: string
  locationTag?: string
}

export function isNpcCombatTier(value: unknown): value is NpcCombatTier {
  return typeof value === 'string' && (NPC_COMBAT_TIERS as readonly string[]).includes(value)
}

export function isRetiredAdventurerProfile(value: unknown): value is RetiredAdventurerProfile {
  return typeof value === 'string' && (RETIRED_ADVENTURER_PROFILES as readonly string[]).includes(value)
}

export function isDefeatDisposition(value: unknown): value is DefeatDisposition {
  return typeof value === 'string' && (DEFEAT_DISPOSITIONS as readonly string[]).includes(value)
}

export function parseRetiredAdventurerReview(value: unknown): RetiredAdventurerReviewResult {
  if (typeof value !== 'object' || value === null) {
    return { upgrade: false }
  }
  const record = value as Record<string, unknown>
  if (record['upgrade'] !== true) {
    return { upgrade: false }
  }
  const profile = record['profile']
  if (!isRetiredAdventurerProfile(profile)) {
    return { upgrade: false }
  }
  return { upgrade: true, profile }
}

export function parseDefeatDispositionProposal(value: unknown): DefeatDispositionProposal | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }
  const record = value as Record<string, unknown>
  if (!isDefeatDisposition(record['disposition']) || typeof record['narrationText'] !== 'string') {
    return undefined
  }
  const locationTag = record['locationTag']
  return {
    disposition: record['disposition'],
    narrationText: record['narrationText'],
    locationTag: typeof locationTag === 'string' ? locationTag : undefined
  }
}

export const PROVOKE_HOSTILE_DISPOSITION = 'hostile — provoked by the player\'s attack'

// === 034.1: yield + non-lethal outcomes when the player is winning ===

export const ATTACK_LETHALITIES = ['lethal', 'non_lethal'] as const
export type AttackLethality = (typeof ATTACK_LETHALITIES)[number]

/** `fight_on` is transient (the NPC keeps fighting) and is never persisted via setNpcEncounterOutcome. */
export const NPC_YIELD_REVIEW_OUTCOMES = [...NPC_YIELD_OUTCOMES, 'fight_on'] as const
export type NpcYieldReviewOutcome = (typeof NPC_YIELD_REVIEW_OUTCOMES)[number]

export interface YieldReviewInput {
  npcName: string
  npcRole: string
  alignment: string | null
  temperament: Temperament
  canSpeak: boolean
  combatTier: NpcCombatTier
  backstory: string
  hp: number
  maxHp: number
  lethality: AttackLethality
  playerOffersMercy: boolean
  allowedOutcomes: NpcYieldOutcome[]
}

export interface YieldReviewResult {
  outcome: NpcYieldReviewOutcome
  narrationText: string
}

export function isAttackLethality(value: unknown): value is AttackLethality {
  return typeof value === 'string' && (ATTACK_LETHALITIES as readonly string[]).includes(value)
}

export function isNpcYieldReviewOutcome(value: unknown): value is NpcYieldReviewOutcome {
  return typeof value === 'string' && (NPC_YIELD_REVIEW_OUTCOMES as readonly string[]).includes(value)
}

export function parseYieldReviewResult(
  value: unknown,
  allowedOutcomes: readonly NpcYieldReviewOutcome[]
): YieldReviewResult | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }
  const record = value as Record<string, unknown>
  const outcome = record['outcome']
  if (!isNpcYieldReviewOutcome(outcome) || !allowedOutcomes.includes(outcome)) {
    return undefined
  }
  if (typeof record['narrationText'] !== 'string') {
    return undefined
  }
  return { outcome, narrationText: record['narrationText'] }
}
