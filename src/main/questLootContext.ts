import type Database from 'better-sqlite3'
import { isLootCompletedState } from '../shared/loot/types'
import type { LootContext } from '../shared/loot/types'
import { inferQuestScaleFromTitleSummary } from '../engine/quests'
import { assembleQuestLootContextFromQuest } from './questLootFromQuest'
import { findThreadById } from './questThreadLookup'

export function shouldTriggerQuestLoot(
  previousState: string,
  newState: string
): boolean {
  const wasCompleted = isLootCompletedState(previousState)
  const isNowCompleted = isLootCompletedState(newState)
  return !wasCompleted && isNowCompleted
}

export function assembleQuestLootContext(params: {
  db: Database.Database
  campaignId: string
  questId?: string
  threadId?: string
  regionId: string
  playerCharacterId: string
  playerLevel: number
}): LootContext | null {
  const { db, campaignId, questId, threadId, regionId, playerCharacterId, playerLevel } = params

  if (questId) {
    return assembleQuestLootContextFromQuest({
      db,
      campaignId,
      questId,
      regionId,
      playerCharacterId,
      playerLevel
    })
  }

  if (!threadId) {
    return null
  }

  const thread = findThreadById(db, campaignId, threadId)
  if (!thread) return null
  if (!isLootCompletedState(thread.state)) return null

  const questScale = inferQuestScaleFromTitleSummary(thread.title, thread.summary)

  return {
    source: 'quest_complete',
    foes: [],
    campaignId,
    regionId,
    playerCharacterId,
    playerLevel,
    questThreadId: thread.id,
    questHookText: thread.summary,
    questScale
  }
}
