import type Database from 'better-sqlite3'
import { canTransitionQuestStatus } from '../engine/quests'
import { getCampaignById } from '../db/repositories/campaigns'
import { getCharacterById } from '../db/repositories/characters'
import { listRegionsByCampaign } from '../db/repositories/regions'
import {
  createQuest,
  getCharacterQuest,
  listCharacterQuests,
  listQuestsByCampaign,
  promoteWorldFactToQuest,
  updateQuest,
  upsertCharacterQuest,
  type UpsertCharacterQuestInput
} from '../db/repositories/quests'
import type {
  CharacterQuestView,
  CreateQuestInput,
  QuestIpcError,
  UpdateQuestInput
} from '../shared/quests/types'
import { applyQuestLogRewardBeats } from './questRewardBeats'
import type { Provider } from '../agents/providers/types'

export function questError(code: QuestIpcError['code'], message: string): QuestIpcError {
  return { ok: false, code, message }
}

export function buildQuestViews(db: Database.Database, characterId: string): CharacterQuestView[] {
  const character = getCharacterById(db, characterId)
  if (!character) {
    return []
  }
  const quests = listQuestsByCampaign(db, character.campaignId)
  const memberships = new Map(listCharacterQuests(db, characterId).map((row) => [row.questId, row]))
  const regionNames = new Map(
    listRegionsByCampaign(db, character.campaignId).map((region) => [region.id, region.name])
  )
  return quests
    .map((quest) => {
      const characterQuest = memberships.get(quest.id)
      if (!characterQuest) {
        return null
      }
      return {
        quest,
        characterQuest,
        regionName: quest.regionId ? (regionNames.get(quest.regionId) ?? null) : null
      }
    })
    .filter((entry): entry is CharacterQuestView => entry !== null)
}

function viewForQuest(db: Database.Database, characterId: string, questId: string): CharacterQuestView | QuestIpcError {
  const [view] = buildQuestViews(db, characterId).filter((row) => row.quest.id === questId)
  return view ?? questError('not_found', 'Quest not found for this character.')
}

export function transitionCharacterQuest(
  db: Database.Database,
  characterId: string,
  questId: string,
  toStatus: UpsertCharacterQuestInput['status']
): CharacterQuestView | QuestIpcError {
  const existing = getCharacterQuest(db, characterId, questId)
  if (!existing) {
    return questError('not_found', 'Quest not found for this character.')
  }
  if (!canTransitionQuestStatus(existing.status, toStatus)) {
    return questError('invalid_transition', `Cannot transition ${existing.status} → ${toStatus}.`)
  }
  const character = getCharacterById(db, characterId)
  const campaign = character ? getCampaignById(db, character.campaignId) : null
  const inGameDate = campaign?.inGameDate ?? 0
  upsertCharacterQuest(db, {
    characterId,
    questId,
    status: toStatus,
    acceptedInGameDate: toStatus === 'active' ? inGameDate : existing.acceptedInGameDate,
    completedInGameDate: toStatus === 'completed' ? inGameDate : existing.completedInGameDate
  })
  return viewForQuest(db, characterId, questId)
}

export async function forceQuestStatus(
  db: Database.Database,
  provider: Provider,
  input: { characterId: string; questId: string; status: UpsertCharacterQuestInput['status'] }
): Promise<CharacterQuestView | QuestIpcError> {
  const character = getCharacterById(db, input.characterId)
  if (!character) {
    return questError('not_found', 'Character not found.')
  }
  const inGameDate = getCampaignById(db, character.campaignId)?.inGameDate ?? 0
  upsertCharacterQuest(db, {
    characterId: input.characterId,
    questId: input.questId,
    status: input.status,
    acceptedInGameDate: input.status === 'active' ? inGameDate : null,
    completedInGameDate: input.status === 'completed' ? inGameDate : null
  })
  if (input.status === 'completed') {
    const regionId =
      (character.stats as { currentRegionId?: string }).currentRegionId ??
      listRegionsByCampaign(db, character.campaignId)[0]?.id
    if (regionId) {
      await applyQuestLogRewardBeats(db, provider, {
        campaignId: character.campaignId,
        regionId,
        character,
        questId: input.questId,
        state: { narrationText: '' }
      })
    }
  }
  return viewForQuest(db, input.characterId, input.questId)
}

export function createQuestForCharacter(
  db: Database.Database,
  input: CreateQuestInput & { characterId: string }
): CharacterQuestView | QuestIpcError {
  const quest = createQuest(db, input)
  const inGameDate = getCampaignById(db, input.campaignId)?.inGameDate ?? 0
  upsertCharacterQuest(db, {
    characterId: input.characterId,
    questId: quest.id,
    status: 'active',
    acceptedInGameDate: inGameDate
  })
  return viewForQuest(db, input.characterId, quest.id)
}

export function updateQuestForCharacter(
  db: Database.Database,
  input: { questId: string; characterId: string; updates: UpdateQuestInput }
): CharacterQuestView | QuestIpcError {
  if (!updateQuest(db, input.questId, input.updates)) {
    return questError('not_found', 'Quest not found.')
  }
  return viewForQuest(db, input.characterId, input.questId)
}

export function promoteWorldFactForCharacter(
  db: Database.Database,
  input: { characterId: string; worldFactId: string }
): CharacterQuestView | QuestIpcError {
  const quest = promoteWorldFactToQuest(db, input.worldFactId)
  if (!quest) {
    return questError('not_found', 'Quest hook not found.')
  }
  upsertCharacterQuest(db, {
    characterId: input.characterId,
    questId: quest.id,
    status: 'available',
    acceptedInGameDate: null
  })
  return viewForQuest(db, input.characterId, quest.id)
}
