import type Database from 'better-sqlite3'
import { inferQuestScale as inferQuestScaleFromQuest } from '../engine/quests'
import { isQuestRewardEligibleStatus } from '../engine/quests'
import { isLootCompletedState } from '../shared/loot/types'
import type { XPContext } from '../shared/progression/types'
import { inferQuestScale, shouldTriggerQuestLoot } from './questLootContext'
import type { StoryThread } from '../db/repositories/storyThreads'
import { listStoryThreadsByCampaign } from '../db/repositories/storyThreads'
import { getCharacterQuest, getQuestById } from '../db/repositories/quests'

export { shouldTriggerQuestLoot as shouldTriggerQuestXp }

function findThreadById(
  db: Database.Database,
  campaignId: string,
  threadId: string
): StoryThread | undefined {
  const threads = listStoryThreadsByCampaign(db, campaignId)
  return threads.find((t) => t.id === threadId)
}

export function assembleQuestXpContext(params: {
  db: Database.Database
  campaignId: string
  questId?: string
  threadId?: string
  regionId: string
  playerCharacterId: string
  playerLevel: number
}): XPContext | null {
  const { db, campaignId, questId, threadId, regionId, playerCharacterId, playerLevel } = params

  if (questId) {
    const quest = getQuestById(db, questId)
    if (!quest) {
      return null
    }
    const charQuest = getCharacterQuest(db, playerCharacterId, questId)
    if (!charQuest || !isQuestRewardEligibleStatus(charQuest.status)) {
      return null
    }
    return {
      source: 'quest_complete',
      foes: [],
      campaignId,
      regionId,
      playerCharacterId,
      playerLevel,
      questId: quest.id,
      questThreadId: quest.storyThreadId ?? undefined,
      questHookText: quest.summary,
      questScale: inferQuestScaleFromQuest(quest)
    }
  }

  if (!threadId) {
    return null
  }

  const thread = findThreadById(db, campaignId, threadId)
  if (!thread) return null
  if (!isLootCompletedState(thread.state)) return null

  return {
    source: 'quest_complete',
    foes: [],
    campaignId,
    regionId,
    playerCharacterId,
    playerLevel,
    questThreadId: thread.id,
    questHookText: thread.summary,
    questScale: inferQuestScale(thread)
  }
}
