import type Database from 'better-sqlite3'
import type { Provider } from '../agents/providers/types'
import type { Character } from '../db/repositories/characters'
import { getCharacterById } from '../db/repositories/characters'
import type { TurnResult } from './turnIpc'
import { runQuestLootPass } from './lootPipeline'
import { runQuestXpPass } from './progressionPipeline'
import { shouldTriggerQuestLoot } from './questLootContext'

type QuestBeatState = {
  xpNarration?: string
  xpAmount?: number
  leveledUp?: boolean
  levelsGained?: number
  lootNarration?: string
  lootGrants?: TurnResult['lootGrants']
  narrationText: string
  encounterXpRan?: boolean
  rewardedQuestIds?: Set<string>
}

function appendBeatNarration(state: QuestBeatState, text: string): void {
  state.narrationText = state.narrationText ? `${state.narrationText} ${text}` : text
}

function markQuestRewarded(state: QuestBeatState, questId: string): boolean {
  if (!state.rewardedQuestIds) {
    state.rewardedQuestIds = new Set()
  }
  if (state.rewardedQuestIds.has(questId)) {
    return false
  }
  state.rewardedQuestIds.add(questId)
  return true
}

export async function applyQuestRewardsToBeatState(
  db: Database.Database,
  provider: Provider,
  input: {
    campaignId: string
    regionId: string
    character: Character
    threadId: string
    previousThreadState: string
    newThreadState: string
    state: QuestBeatState
  }
): Promise<void> {
  if (!shouldTriggerQuestLoot(input.previousThreadState, input.newThreadState)) {
    return
  }
  await applyQuestRewardBeats(db, provider, {
    campaignId: input.campaignId,
    regionId: input.regionId,
    character: input.character,
    threadId: input.threadId,
    state: input.state
  })
}

export async function applyQuestLogRewardBeats(
  db: Database.Database,
  provider: Provider,
  input: {
    campaignId: string
    regionId: string
    character: Character
    questId: string
    state: QuestBeatState
  }
): Promise<void> {
  if (!markQuestRewarded(input.state, input.questId)) {
    return
  }
  await applyQuestRewardBeats(db, provider, {
    campaignId: input.campaignId,
    regionId: input.regionId,
    character: input.character,
    questId: input.questId,
    state: input.state
  })
}

export async function applyQuestRewardBeats(
  db: Database.Database,
  provider: Provider,
  input: {
    campaignId: string
    regionId: string
    character: Character
    threadId?: string
    questId?: string
    state: QuestBeatState
  }
): Promise<void> {
  const xp = await runQuestXpPass({
    db,
    provider,
    campaignId: input.campaignId,
    threadId: input.threadId,
    questId: input.questId,
    regionId: input.regionId,
    playerCharacterId: input.character.id,
    playerLevel: input.character.level,
    encounterXpRanThisTurn: input.state.encounterXpRan === true
  })
  if (xp) {
    input.state.xpNarration = xp.xpNarration
    input.state.xpAmount = xp.xpAmount
    input.state.leveledUp = xp.leveledUp
    input.state.levelsGained = xp.levelsGained
    appendBeatNarration(input.state, xp.xpNarration)
  }

  const refreshed = getCharacterById(db, input.character.id) ?? input.character
  const questLoot = await runQuestLootPass({
    db,
    provider,
    campaignId: input.campaignId,
    threadId: input.threadId,
    questId: input.questId,
    regionId: input.regionId,
    playerCharacterId: refreshed.id,
    playerLevel: refreshed.level,
    encounterLootRanThisTurn: input.state.encounterXpRan === true
  })
  if (questLoot?.lootNarration) {
    input.state.lootNarration = questLoot.lootNarration
    input.state.lootGrants = questLoot.lootGrants
    appendBeatNarration(input.state, questLoot.lootNarration)
  }
}
