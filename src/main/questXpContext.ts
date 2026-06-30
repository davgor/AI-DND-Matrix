import type Database from 'better-sqlite3'
import { isLootCompletedState } from '../shared/loot/types'
import type { XPContext } from '../shared/progression/types'
import { inferQuestScale, shouldTriggerQuestLoot } from './questLootContext'
import type { StoryThread } from '../db/repositories/storyThreads'
import { listStoryThreadsByCampaign } from '../db/repositories/storyThreads'

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
  threadId: string
  regionId: string
  playerCharacterId: string
  playerLevel: number
}): XPContext | null {
  const { db, campaignId, threadId, regionId, playerCharacterId, playerLevel } = params
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
