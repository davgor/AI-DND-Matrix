import type Database from 'better-sqlite3'
import { isQuestRewardEligibleStatus, storyThreadStateToQuestStatus, validateObjectiveUpdate } from '../engine/quests'
import { objectiveTextsToChecklist } from '../engine/quests'
import { getCampaignById } from '../db/repositories/campaigns'
import { getCharacterById } from '../db/repositories/characters'
import {
  createQuest,
  getCharacterQuest,
  getMainQuestByCampaign,
  getQuestById,
  promoteWorldFactToQuest,
  updateQuest,
  upsertCharacterQuest
} from '../db/repositories/quests'
import { getRegionById } from '../db/repositories/regions'
import { updateStoryThreadStateAndSummary } from '../db/repositories/storyThreads'
import { getWorldFactById } from '../db/repositories/worldFacts'
import type { QuestScale } from '../shared/loot/types'
import type { QuestKind, UpdateQuestInput } from '../shared/quests/types'
import { assignQuestFoes } from './bestiary/assignQuestFoes'
import type { NarrationResult } from './dm'
import type { Provider } from './providers/types'

export interface QuestProposal {
  kind: QuestKind
  title: string
  summary: string
  scale: QuestScale
  regionId?: string
  objectives?: string[]
  relatedWorldFactId?: string
}

export interface QuestUpdate {
  questId: string
  objectiveIndex?: number
  objectiveDone?: boolean
  summary?: string
}

export interface QuestSideEffectResult {
  completedQuestIds: string[]
}

interface QuestProposalPersistInput {
  db: Database.Database
  campaignId: string
  characterId: string
  proposal: QuestProposal
  inGameDate: number
  provider?: Provider
  playerLevel?: number
  onSpeciesCreated?: (input: { campaignId: string; speciesId: string }) => void
}

function resolveExistingRegionId(db: Database.Database, regionId: string | undefined): string | null {
  if (!regionId) {
    return null
  }
  return getRegionById(db, regionId) ? regionId : null
}

function resolveExistingWorldFactId(db: Database.Database, worldFactId: string | undefined): string | null {
  if (!worldFactId) {
    return null
  }
  return getWorldFactById(db, worldFactId) ? worldFactId : null
}

function resolveQuestIdFromProposal(input: QuestProposalPersistInput): string {
  const { db, campaignId, proposal } = input
  if (proposal.relatedWorldFactId) {
    const promotedId = promoteWorldFactToQuest(db, proposal.relatedWorldFactId)?.id
    if (promotedId) {
      return promotedId
    }
  }
  return createQuest(db, {
    campaignId,
    kind: proposal.kind,
    title: proposal.title,
    summary: proposal.summary,
    regionId: resolveExistingRegionId(db, proposal.regionId),
    sourceWorldFactId: resolveExistingWorldFactId(db, proposal.relatedWorldFactId),
    scale: proposal.scale,
    objectives: objectiveTextsToChecklist(proposal.objectives ?? [proposal.summary])
  }).id
}

function buildProposalQuestUpdate(db: Database.Database, proposal: QuestProposal): UpdateQuestInput {
  const updates: UpdateQuestInput = {
    title: proposal.title,
    summary: proposal.summary,
    scale: proposal.scale
  }
  if (!proposal.regionId) {
    return updates
  }
  const regionId = resolveExistingRegionId(db, proposal.regionId)
  if (regionId) {
    updates.regionId = regionId
  }
  return updates
}

async function persistQuestProposal(input: QuestProposalPersistInput): Promise<string | null> {
  const { db, campaignId, characterId, proposal, inGameDate, provider, playerLevel } = input
  const questId = resolveQuestIdFromProposal(input)
  if (proposal.relatedWorldFactId && proposal.summary) {
    updateQuest(db, questId, buildProposalQuestUpdate(db, proposal))
  }
  const status = proposal.kind === 'side' ? 'available' : 'active'
  upsertCharacterQuest(db, {
    characterId,
    questId,
    status,
    acceptedInGameDate: status === 'active' ? inGameDate : null
  })
  if (provider) {
    await assignQuestFoes(
      db,
      provider,
      {
        campaignId,
        questId,
        title: proposal.title,
        summary: proposal.summary,
        ...(typeof playerLevel === 'number' ? { playerLevel } : {})
      },
      { onSpeciesCreated: input.onSpeciesCreated }
    )
  }
  return questId
}

function persistQuestUpdate(
  db: Database.Database,
  characterId: string,
  update: QuestUpdate
): void {
  const quest = getQuestById(db, update.questId)
  if (!quest || !getCharacterQuest(db, characterId, quest.id)) {
    return
  }
  let objectives = quest.objectives
  if (typeof update.objectiveIndex === 'number' && update.objectiveDone === true) {
    const next = validateObjectiveUpdate(objectives, update.objectiveIndex)
    if (next) {
      objectives = next
    }
  }
  updateQuest(db, quest.id, {
    summary: update.summary ?? quest.summary,
    objectives
  })
}

function completeCharacterQuest(
  db: Database.Database,
  characterId: string,
  questId: string,
  inGameDate: number
): boolean {
  const charQuest = getCharacterQuest(db, characterId, questId)
  if (!getQuestById(db, questId) || !charQuest || isQuestRewardEligibleStatus(charQuest.status)) {
    return false
  }
  upsertCharacterQuest(db, {
    characterId,
    questId,
    status: 'completed',
    completedInGameDate: inGameDate
  })
  return true
}

function applyMainQuestStatus(
  db: Database.Database,
  input: { characterId: string; questId: string; status: ReturnType<typeof storyThreadStateToQuestStatus>; inGameDate: number }
): string | null {
  const { characterId, questId, status, inGameDate } = input
  if (!status) {
    return null
  }
  const existing = getCharacterQuest(db, characterId, questId)
  if (!existing) {
    upsertCharacterQuest(db, {
      characterId,
      questId,
      status,
      acceptedInGameDate: inGameDate,
      completedInGameDate: status === 'completed' ? inGameDate : null
    })
    return status === 'completed' ? questId : null
  }
  if (status === 'completed' && !isQuestRewardEligibleStatus(existing.status)) {
    upsertCharacterQuest(db, { characterId, questId, status: 'completed', completedInGameDate: inGameDate })
    return questId
  }
  if (status !== existing.status) {
    upsertCharacterQuest(db, {
      characterId,
      questId,
      status,
      completedInGameDate: status === 'completed' ? inGameDate : existing.completedInGameDate
    })
  }
  return null
}

function syncMainQuestFromStoryThread(input: {
  db: Database.Database
  campaignId: string
  characterId: string
  threadId: string
  state: string
  summary: string
  inGameDate: number
}): string | null {
  const mainQuest = getMainQuestByCampaign(input.db, input.campaignId)
  if (!mainQuest || mainQuest.storyThreadId !== input.threadId) {
    return null
  }
  const mapped = storyThreadStateToQuestStatus(input.state)
  updateQuest(input.db, mainQuest.id, { summary: input.summary })
  return applyMainQuestStatus(input.db, {
    characterId: input.characterId,
    questId: mainQuest.id,
    status: mapped,
    inGameDate: input.inGameDate
  })
}

function collectCompletedQuestIds(
  db: Database.Database,
  characterId: string,
  questIds: string[],
  inGameDate: number
): string[] {
  const completed: string[] = []
  for (const questId of questIds) {
    if (completeCharacterQuest(db, characterId, questId, inGameDate)) {
      completed.push(questId)
    }
  }
  return completed
}

function applyStoryThreadSideEffect(input: {
  db: Database.Database
  campaignId: string
  characterId: string
  inGameDate: number
  update: NonNullable<NarrationResult['storyThreadUpdate']>
}): string | null {
  updateStoryThreadStateAndSummary(
    input.db,
    input.update.threadId,
    input.update.state,
    input.update.summary
  )
  return syncMainQuestFromStoryThread({
    db: input.db,
    campaignId: input.campaignId,
    characterId: input.characterId,
    threadId: input.update.threadId,
    state: input.update.state,
    summary: input.update.summary,
    inGameDate: input.inGameDate
  })
}

async function persistAllQuestProposals(input: {
  db: Database.Database
  campaignId: string
  characterId: string
  inGameDate: number
  proposals: QuestProposal[]
  provider?: Provider
  playerLevel?: number
  onSpeciesCreated?: (input: { campaignId: string; speciesId: string }) => void
}): Promise<void> {
  for (const proposal of input.proposals) {
    await persistQuestProposal({
      db: input.db,
      campaignId: input.campaignId,
      characterId: input.characterId,
      proposal,
      inGameDate: input.inGameDate,
      provider: input.provider,
      playerLevel: input.playerLevel,
      onSpeciesCreated: input.onSpeciesCreated
    })
  }
}

function completedIdsFromStoryThread(input: {
  db: Database.Database
  campaignId: string
  characterId: string
  inGameDate: number
  update: NarrationResult['storyThreadUpdate']
}): string[] {
  if (!input.update) {
    return []
  }
  const syncedId = applyStoryThreadSideEffect({
    db: input.db,
    campaignId: input.campaignId,
    characterId: input.characterId,
    inGameDate: input.inGameDate,
    update: input.update
  })
  return syncedId ? [syncedId] : []
}

export async function persistQuestNarrationSideEffects(
  db: Database.Database,
  result: NarrationResult,
  input: {
    campaignId: string
    characterId: string
    provider?: Provider
    playerLevel?: number
    onSpeciesCreated?: (input: { campaignId: string; speciesId: string }) => void
  }
): Promise<QuestSideEffectResult> {
  const inGameDate = getCampaignById(db, input.campaignId)?.inGameDate ?? 0
  const playerLevel = input.playerLevel ?? getCharacterById(db, input.characterId)?.level
  const completedFromThread = completedIdsFromStoryThread({
    db,
    campaignId: input.campaignId,
    characterId: input.characterId,
    inGameDate,
    update: result.storyThreadUpdate
  })

  await persistAllQuestProposals({
    db,
    campaignId: input.campaignId,
    characterId: input.characterId,
    inGameDate,
    proposals: result.questProposals ?? [],
    provider: input.provider,
    playerLevel,
    onSpeciesCreated: input.onSpeciesCreated
  })
  for (const update of result.questUpdates ?? []) {
    persistQuestUpdate(db, input.characterId, update)
  }

  return {
    completedQuestIds: [
      ...completedFromThread,
      ...collectCompletedQuestIds(db, input.characterId, result.questCompletions ?? [], inGameDate)
    ]
  }
}

export function isValidQuestProposal(value: unknown): value is QuestProposal {
  if (!value || typeof value !== 'object') {
    return false
  }
  const body = value as Record<string, unknown>
  return (
    (body.kind === 'main' || body.kind === 'side') &&
    typeof body.title === 'string' &&
    typeof body.summary === 'string' &&
    (body.scale === 'minor' || body.scale === 'major')
  )
}

export function isValidQuestUpdate(value: unknown): value is QuestUpdate {
  if (!value || typeof value !== 'object') {
    return false
  }
  const body = value as Record<string, unknown>
  return typeof body.questId === 'string'
}
