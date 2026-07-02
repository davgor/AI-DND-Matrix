import type { Bucket } from '../catalogTaxonomy'
import type { NpcYieldOutcome } from '../combat/types'
import type { NpcCombatTier } from '../npcCombat/types'
import type { QuestScale } from '../loot/types'
import { LOOT_SOURCES } from '../loot/types'

export const XP_SOURCES = LOOT_SOURCES
export type XPSource = (typeof XP_SOURCES)[number]

export const ACTIVITY_TAGS = ['combat', 'arcane', 'social', 'exploration'] as const
export type ActivityTag = (typeof ACTIVITY_TAGS)[number]

export const PERK_CATEGORIES = [
  'ac_bonus',
  'extra_attack',
  'spell_access',
  'hp_max_bonus',
  'check_proficiency',
  'passive_feature',
  'custom_feature'
] as const
export type PerkCategory = (typeof PERK_CATEGORIES)[number]

export const CHECK_PROFICIENCY_ABILITIES = ['body', 'agility', 'mind', 'presence'] as const
export type CheckProficiencyAbility = (typeof CHECK_PROFICIENCY_ABILITIES)[number]

export interface XpFoeSummary {
  npcId: string
  npcRole: string
  combatTier: NpcCombatTier
  buckets: Bucket[]
  outcome: NpcYieldOutcome
}

export interface XPContext {
  source: XPSource
  foes: XpFoeSummary[]
  regionId: string
  playerLevel: number
  playerCharacterId: string
  campaignId: string
  roundCount?: number
  questThreadId?: string
  questId?: string
  questHookText?: string
  questScale?: QuestScale
}

export interface XPBudget {
  min: number
  max: number
  suggested: number
}

export interface ActivityTagCounts {
  combat: number
  arcane: number
  social: number
  exploration: number
}

export interface LevelSpanContext {
  characterId: string
  campaignId: string
  archetype: string
  newLevel: number
  spanStartXp: number
  activityTags: ActivityTagCounts
  emergentDirection: { tag: string; count: number } | null
  recentEventSummaries: string[]
  journalSnippets: string[]
  logBookSnippets: string[]
}

export interface PerkProposal {
  id: string
  name: string
  description: string
  category: PerkCategory
  flavorTags: string[]
  catalogSpellKey?: string
  proficiencyAbility?: CheckProficiencyAbility
}

export interface AppliedPerk {
  id: string
  levelGained: number
  category: PerkCategory
  name: string
  description: string
  mechanicalSummary: string
  grantedAt: string
}

export interface PendingLevelUpCeremony {
  targetLevel: number
  spanStartXp: number
  narrationText: string
  perks: PerkProposal[]
}

export interface XpAwardAgentResponse {
  narrationText: string
  xpAmount: number
}

export interface LevelUpAgentResponse {
  narrationText: string
  perks: PerkProposal[]
}

export function isXpSource(value: unknown): value is XPSource {
  return typeof value === 'string' && (XP_SOURCES as readonly string[]).includes(value)
}

export function isPerkCategory(value: unknown): value is PerkCategory {
  return typeof value === 'string' && (PERK_CATEGORIES as readonly string[]).includes(value)
}

export function isCheckProficiencyAbility(value: unknown): value is CheckProficiencyAbility {
  return typeof value === 'string' && (CHECK_PROFICIENCY_ABILITIES as readonly string[]).includes(value)
}

export function parseXpAwardAgentResponse(raw: unknown): XpAwardAgentResponse | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const body = raw as Record<string, unknown>
  if (typeof body.narrationText !== 'string') {
    return null
  }
  if (typeof body.xpAmount !== 'number' || !Number.isFinite(body.xpAmount)) {
    return null
  }
  return { narrationText: body.narrationText, xpAmount: Math.floor(body.xpAmount) }
}

import { parsePerkProposal } from './parsePerkProposal'

export function parseLevelUpAgentResponse(raw: unknown): LevelUpAgentResponse | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const body = raw as Record<string, unknown>
  if (typeof body.narrationText !== 'string') {
    return null
  }
  if (!Array.isArray(body.perks)) {
    return null
  }
  const perks = body.perks.map(parsePerkProposal).filter((p): p is PerkProposal => p !== null)
  if (perks.length !== 3) {
    return null
  }
  const ids = new Set(perks.map((p) => p.id))
  if (ids.size !== 3) {
    return null
  }
  return { narrationText: body.narrationText, perks }
}
