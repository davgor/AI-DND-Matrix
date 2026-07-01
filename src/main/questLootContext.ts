import type Database from 'better-sqlite3'
import { isLootCompletedState } from '../shared/loot/types'
import type { LootContext, QuestScale } from '../shared/loot/types'
import type { StoryThread } from '../db/repositories/storyThreads'
import { listStoryThreadsByCampaign } from '../db/repositories/storyThreads'
import { assembleQuestLootContextFromQuest } from './questLootFromQuest'

const MAJOR_TITLE_KEYWORDS = [
  'quest',
  'mission',
  'dragon',
  'cult',
  'ritual',
  'dungeon',
  'rescue',
  'ancient',
  'prophecy'
] as const

const MAJOR_SUMMARY_THRESHOLD = 200

export function shouldTriggerQuestLoot(
  previousState: string,
  newState: string
): boolean {
  const wasCompleted = isLootCompletedState(previousState)
  const isNowCompleted = isLootCompletedState(newState)
  return !wasCompleted && isNowCompleted
}

export function inferQuestScale(thread: StoryThread): QuestScale {
  if (thread.summary.length > MAJOR_SUMMARY_THRESHOLD) {
    return 'major'
  }
  const lowerTitle = thread.title.toLowerCase()
  const hasMajorKeyword = MAJOR_TITLE_KEYWORDS.some((kw) => lowerTitle.includes(kw))
  return hasMajorKeyword ? 'major' : 'minor'
}

function findThreadById(
  db: Database.Database,
  campaignId: string,
  threadId: string
): StoryThread | undefined {
  const threads = listStoryThreadsByCampaign(db, campaignId)
  return threads.find((t) => t.id === threadId)
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

  const questScale = inferQuestScale(thread)

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
