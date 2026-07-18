import type Database from 'better-sqlite3'
import type { StoryThread } from '../db/repositories/storyThreads'
import { listStoryThreadsByCampaign } from '../db/repositories/storyThreads'

export function findThreadById(
  db: Database.Database,
  campaignId: string,
  threadId: string
): StoryThread | undefined {
  const threads = listStoryThreadsByCampaign(db, campaignId)
  return threads.find((thread) => thread.id === threadId)
}
