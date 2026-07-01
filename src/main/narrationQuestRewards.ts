import type Database from 'better-sqlite3'
import type { Provider } from '../agents/providers/types'
import type { Character } from '../db/repositories/characters'
import { getQuestById } from '../db/repositories/quests'
import type { NarrationResult } from '../agents/dm'
import { applyQuestLogRewardBeats, applyQuestRewardsToBeatState } from './questRewardBeats'

interface BeatExecutionState {
  rewardedQuestIds?: Set<string>
  encounterXpRan?: boolean
  narrationText: string
}

export async function applyNarrationQuestRewards(input: {
  db: Database.Database
  provider: Provider
  campaignId: string
  regionId: string
  character: Character
  narrationResult: NarrationResult
  previousThreadState?: string
  completedQuestIds: string[]
  state: BeatExecutionState
}): Promise<void> {
  for (const questId of input.completedQuestIds) {
    await applyQuestLogRewardBeats(input.db, input.provider, {
      campaignId: input.campaignId,
      regionId: input.regionId,
      character: input.character,
      questId,
      state: input.state
    })
  }
  const threadUpdate = input.narrationResult.storyThreadUpdate
  const mainQuestSynced = threadUpdate
    ? input.completedQuestIds.some(
        (questId) => getQuestById(input.db, questId)?.storyThreadId === threadUpdate.threadId
      )
    : false
  if (!threadUpdate || !input.previousThreadState || mainQuestSynced) {
    return
  }
  await applyQuestRewardsToBeatState(input.db, input.provider, {
    campaignId: input.campaignId,
    regionId: input.regionId,
    character: input.character,
    threadId: threadUpdate.threadId,
    previousThreadState: input.previousThreadState,
    newThreadState: threadUpdate.state,
    state: input.state
  })
}
