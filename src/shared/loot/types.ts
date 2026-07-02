import type { Bucket } from '../catalogTaxonomy'
import type { ItemType, ItemRarity } from '../items/types'
import type { NpcYieldOutcome } from '../combat/types'
import type { NpcCombatTier } from '../npcCombat/types'

export const LOOT_SOURCES = ['encounter_end', 'quest_complete'] as const
export type LootSource = (typeof LOOT_SOURCES)[number]

export const QUEST_SCALES = ['minor', 'major'] as const
export type QuestScale = (typeof QUEST_SCALES)[number]

export const LOOT_COMPLETED_STATES = ['completed', 'resolved', 'done'] as const
export type LootCompletedState = (typeof LOOT_COMPLETED_STATES)[number]

export interface FoeSummary {
  npcId: string
  npcRole: string
  combatTier: NpcCombatTier
  buckets: Bucket[]
  outcome: NpcYieldOutcome
}

export interface LootContext {
  source: LootSource
  foes: FoeSummary[]
  regionId: string
  playerLevel: number
  playerCharacterId: string
  campaignId: string
  questThreadId?: string
  questId?: string
  questHookText?: string
  questScale?: QuestScale
}

export interface LootPolicy {
  allowedItemTypes: ItemType[]
  maxRarity: ItemRarity
  maxGrantCount: number
  catalogRetrieveFirst: true
}

export interface LootGrantResult {
  accepted: LootGrantAccepted[]
  rejected: LootGrantRejected[]
}

export interface LootGrantAccepted {
  itemId: string
  itemName: string
}

export interface LootGrantRejected {
  reason: string
  raw: unknown
}

export interface LootResolutionResult {
  narrationText: string
  grantResult: LootGrantResult
  nothingToFind: boolean
}

export function isLootCompletedState(value: string): value is LootCompletedState {
  return (LOOT_COMPLETED_STATES as readonly string[]).includes(value)
}

export function isQuestScale(value: unknown): value is QuestScale {
  return typeof value === 'string' && (QUEST_SCALES as readonly string[]).includes(value)
}

export function isLootSource(value: unknown): value is LootSource {
  return typeof value === 'string' && (LOOT_SOURCES as readonly string[]).includes(value)
}
