import type Database from 'better-sqlite3'
import { isQuestRewardEligibleStatus } from '../engine/quests'
import { inferQuestScale as inferQuestScaleFromQuest } from '../engine/quests'
import type { LootContext } from '../shared/loot/types'
import { getCharacterQuest, getQuestById } from '../db/repositories/quests'

export function assembleQuestLootContextFromQuest(params: {
  db: Database.Database
  campaignId: string
  questId: string
  regionId: string
  playerCharacterId: string
  playerLevel: number
}): LootContext | null {
  const { db, campaignId, questId, regionId, playerCharacterId, playerLevel } = params
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
