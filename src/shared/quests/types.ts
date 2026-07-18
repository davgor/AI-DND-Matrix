import type { QuestScale } from '../loot/types'

export type { QuestScale }

export const QUEST_KINDS = ['main', 'side'] as const
export type QuestKind = (typeof QUEST_KINDS)[number]

export const QUEST_STATUSES = ['available', 'active', 'completed', 'failed', 'abandoned'] as const
export type QuestStatus = (typeof QUEST_STATUSES)[number]

export interface QuestObjective {
  id: string
  text: string
  done: boolean
}

export interface Quest {
  id: string
  campaignId: string
  kind: QuestKind
  title: string
  summary: string
  hookLine: string | null
  storyThreadId: string | null
  premiseAnchor: string | null
  regionId: string | null
  sourceWorldFactId: string | null
  scale: QuestScale
  objectives: QuestObjective[]
  createdAt: string
}

export interface CharacterQuest {
  characterId: string
  questId: string
  status: QuestStatus
  acceptedInGameDate: number | null
  completedInGameDate: number | null
  playerNotes: string | null
  updatedAt: string
}

export interface CharacterQuestView {
  quest: Quest
  characterQuest: CharacterQuest
  regionName: string | null
}

/** Max active quests injected into DM narration context (main story prioritized). */
export const MAX_ACTIVE_QUESTS_IN_CONTEXT = 3

export type QuestIpcErrorCode = 'invalid_transition' | 'not_found' | 'validation_error'

export interface QuestIpcError {
  ok: false
  code: QuestIpcErrorCode
  message: string
}

export interface CreateQuestInput {
  campaignId: string
  kind: QuestKind
  title: string
  summary?: string
  hookLine?: string | null
  storyThreadId?: string | null
  premiseAnchor?: string | null
  regionId?: string | null
  sourceWorldFactId?: string | null
  scale?: QuestScale
  objectives?: QuestObjective[]
}

export interface UpdateQuestInput {
  title?: string
  summary?: string
  hookLine?: string | null
  scale?: QuestScale
  objectives?: QuestObjective[]
  regionId?: string | null
}

export function isQuestKind(value: unknown): value is QuestKind {
  return typeof value === 'string' && (QUEST_KINDS as readonly string[]).includes(value)
}

export function isQuestStatus(value: unknown): value is QuestStatus {
  return typeof value === 'string' && (QUEST_STATUSES as readonly string[]).includes(value)
}
