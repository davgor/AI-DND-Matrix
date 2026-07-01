import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import { objectiveTextsToChecklist } from '../../engine/quests'
import type {
  CharacterQuest,
  CreateQuestInput,
  Quest,
  QuestObjective,
  QuestStatus,
  UpdateQuestInput
} from '../../shared/quests/types'
import { getCampaignById } from './campaigns'
import { listCharactersByCampaign } from './characters'
import { questDefaults } from './questDefaults'
import { listStoryThreadsByCampaign } from './storyThreads'

interface QuestRow {
  id: string
  campaign_id: string
  kind: string
  title: string
  summary: string
  hook_line: string | null
  story_thread_id: string | null
  premise_anchor: string | null
  region_id: string | null
  source_world_fact_id: string | null
  scale: string
  objectives_json: string
  created_at: string
}

interface CharacterQuestRow {
  character_id: string
  quest_id: string
  status: string
  accepted_in_game_date: number | null
  completed_in_game_date: number | null
  player_notes: string | null
  updated_at: string
}

function parseObjectives(json: string): QuestObjective[] {
  return JSON.parse(json) as QuestObjective[]
}

function rowToQuest(row: QuestRow): Quest {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    kind: row.kind as Quest['kind'],
    title: row.title,
    summary: row.summary,
    hookLine: row.hook_line,
    storyThreadId: row.story_thread_id,
    premiseAnchor: row.premise_anchor,
    regionId: row.region_id,
    sourceWorldFactId: row.source_world_fact_id,
    scale: row.scale as Quest['scale'],
    objectives: parseObjectives(row.objectives_json),
    createdAt: row.created_at
  }
}

function rowToCharacterQuest(row: CharacterQuestRow): CharacterQuest {
  return {
    characterId: row.character_id,
    questId: row.quest_id,
    status: row.status as QuestStatus,
    acceptedInGameDate: row.accepted_in_game_date,
    completedInGameDate: row.completed_in_game_date,
    playerNotes: row.player_notes,
    updatedAt: row.updated_at
  }
}

export function createQuest(db: Database.Database, input: CreateQuestInput): Quest {
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  const values = questDefaults(input)
  db.prepare(
    `INSERT INTO quests (
      id, campaign_id, kind, title, summary, hook_line, story_thread_id,
      premise_anchor, region_id, source_world_fact_id, scale, objectives_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.campaignId,
    input.kind,
    input.title,
    values.summary,
    values.hookLine,
    values.storyThreadId,
    values.premiseAnchor,
    values.regionId,
    values.sourceWorldFactId,
    values.scale,
    JSON.stringify(values.objectives),
    createdAt
  )
  return {
    id,
    campaignId: input.campaignId,
    kind: input.kind,
    title: input.title,
    ...values,
    createdAt
  }
}

export function getQuestById(db: Database.Database, questId: string): Quest | null {
  const row = db.prepare('SELECT * FROM quests WHERE id = ?').get(questId) as QuestRow | undefined
  return row ? rowToQuest(row) : null
}

export function listQuestsByCampaign(db: Database.Database, campaignId: string): Quest[] {
  const rows = db
    .prepare('SELECT * FROM quests WHERE campaign_id = ? ORDER BY created_at')
    .all(campaignId) as QuestRow[]
  return rows.map(rowToQuest)
}

export function updateQuest(db: Database.Database, questId: string, updates: UpdateQuestInput): Quest | null {
  const existing = getQuestById(db, questId)
  if (!existing) {
    return null
  }
  const next = {
    title: updates.title ?? existing.title,
    summary: updates.summary ?? existing.summary,
    hookLine: updates.hookLine !== undefined ? updates.hookLine : existing.hookLine,
    scale: updates.scale ?? existing.scale,
    objectives: updates.objectives ?? existing.objectives,
    regionId: updates.regionId !== undefined ? updates.regionId : existing.regionId
  }
  db.prepare(
    `UPDATE quests SET title = ?, summary = ?, hook_line = ?, scale = ?, objectives_json = ?, region_id = ?
     WHERE id = ?`
  ).run(
    next.title,
    next.summary,
    next.hookLine,
    next.scale,
    JSON.stringify(next.objectives),
    next.regionId,
    questId
  )
  return getQuestById(db, questId)
}

export function deleteQuest(db: Database.Database, questId: string): boolean {
  const result = db.prepare('DELETE FROM quests WHERE id = ?').run(questId)
  return result.changes > 0
}

export function getQuestBySourceWorldFactId(
  db: Database.Database,
  sourceWorldFactId: string
): Quest | null {
  const row = db
    .prepare('SELECT * FROM quests WHERE source_world_fact_id = ?')
    .get(sourceWorldFactId) as QuestRow | undefined
  return row ? rowToQuest(row) : null
}

export function getMainQuestByCampaign(db: Database.Database, campaignId: string): Quest | null {
  const row = db
    .prepare(`SELECT * FROM quests WHERE campaign_id = ? AND kind = 'main' LIMIT 1`)
    .get(campaignId) as QuestRow | undefined
  return row ? rowToQuest(row) : null
}

export interface UpsertCharacterQuestInput {
  characterId: string
  questId: string
  status: QuestStatus
  acceptedInGameDate?: number | null
  completedInGameDate?: number | null
  playerNotes?: string | null
}

export function upsertCharacterQuest(
  db: Database.Database,
  input: UpsertCharacterQuestInput
): CharacterQuest {
  const updatedAt = new Date().toISOString()
  db.prepare(
    `INSERT INTO character_quests (
      character_id, quest_id, status, accepted_in_game_date, completed_in_game_date, player_notes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(character_id, quest_id) DO UPDATE SET
      status = excluded.status,
      accepted_in_game_date = COALESCE(excluded.accepted_in_game_date, character_quests.accepted_in_game_date),
      completed_in_game_date = COALESCE(excluded.completed_in_game_date, character_quests.completed_in_game_date),
      player_notes = COALESCE(excluded.player_notes, character_quests.player_notes),
      updated_at = excluded.updated_at`
  ).run(
    input.characterId,
    input.questId,
    input.status,
    input.acceptedInGameDate ?? null,
    input.completedInGameDate ?? null,
    input.playerNotes ?? null,
    updatedAt
  )
  return getCharacterQuest(db, input.characterId, input.questId)!
}

export function getCharacterQuest(
  db: Database.Database,
  characterId: string,
  questId: string
): CharacterQuest | null {
  const row = db
    .prepare('SELECT * FROM character_quests WHERE character_id = ? AND quest_id = ?')
    .get(characterId, questId) as CharacterQuestRow | undefined
  return row ? rowToCharacterQuest(row) : null
}

export function listCharacterQuests(db: Database.Database, characterId: string): CharacterQuest[] {
  const rows = db
    .prepare('SELECT * FROM character_quests WHERE character_id = ?')
    .all(characterId) as CharacterQuestRow[]
  return rows.map(rowToCharacterQuest)
}

export function listActiveQuestsForCharacter(db: Database.Database, characterId: string): Quest[] {
  const rows = db
    .prepare(
      `SELECT q.* FROM quests q
       INNER JOIN character_quests cq ON cq.quest_id = q.id
       WHERE cq.character_id = ? AND cq.status = 'active'
       ORDER BY cq.accepted_in_game_date DESC, q.created_at`
    )
    .all(characterId) as QuestRow[]
  return rows.map(rowToQuest)
}

function titleFromHookContent(content: string): string {
  const trimmed = content.trim()
  const firstSentence = trimmed.split(/[.!?]/)[0]?.trim()
  return firstSentence && firstSentence.length > 0 ? firstSentence : trimmed.slice(0, 80)
}

export function promoteWorldFactToQuest(db: Database.Database, worldFactId: string): Quest | null {
  const row = db
    .prepare('SELECT * FROM world_facts WHERE id = ?')
    .get(worldFactId) as
    | {
        id: string
        campaign_id: string
        region_id: string | null
        faction_tag: string | null
        content: string
      }
    | undefined
  if (!row || row.faction_tag !== 'quest_hook') {
    return null
  }
  const existing = getQuestBySourceWorldFactId(db, row.id)
  if (existing) {
    return existing
  }
  return createQuest(db, {
    campaignId: row.campaign_id,
    kind: 'side',
    title: titleFromHookContent(row.content),
    summary: row.content,
    regionId: row.region_id,
    sourceWorldFactId: row.id,
    scale: 'minor',
    objectives: objectiveTextsToChecklist([row.content])
  })
}

export function importSideQuestsFromQuestHooks(db: Database.Database, campaignId: string): Quest[] {
  const rows = db
    .prepare(
      `SELECT id FROM world_facts WHERE campaign_id = ? AND faction_tag = 'quest_hook' ORDER BY created_at`
    )
    .all(campaignId) as Array<{ id: string }>
  const quests: Quest[] = []
  for (const row of rows) {
    const quest = promoteWorldFactToQuest(db, row.id)
    if (quest) {
      quests.push(quest)
    }
  }
  return quests
}

export function seedMainQuestForCampaign(
  db: Database.Database,
  input: { campaignId: string; storyThreadId: string; title: string; summary: string }
): Quest {
  const existing = getMainQuestByCampaign(db, input.campaignId)
  if (existing) {
    return existing
  }
  const campaign = getCampaignById(db, input.campaignId)
  return createQuest(db, {
    campaignId: input.campaignId,
    kind: 'main',
    title: input.title,
    summary: input.summary,
    hookLine: campaign?.premisePrompt ?? null,
    premiseAnchor: campaign?.premisePrompt ?? null,
    storyThreadId: input.storyThreadId,
    scale: 'major',
    objectives: objectiveTextsToChecklist([input.summary || input.title])
  })
}

export function seedCharacterQuestMembership(
  db: Database.Database,
  campaignId: string,
  characterId: string,
  inGameDate: number
): void {
  const quests = listQuestsByCampaign(db, campaignId)
  for (const quest of quests) {
    const existing = getCharacterQuest(db, characterId, quest.id)
    if (existing) {
      continue
    }
    const status: QuestStatus = quest.kind === 'main' ? 'active' : 'available'
    upsertCharacterQuest(db, {
      characterId,
      questId: quest.id,
      status,
      acceptedInGameDate: status === 'active' ? inGameDate : null
    })
  }
}

export function seedAllPlayerCharacterQuestMembership(
  db: Database.Database,
  campaignId: string,
  inGameDate: number
): void {
  const players = listCharactersByCampaign(db, campaignId).filter((c) => c.kind === 'player')
  for (const player of players) {
    seedCharacterQuestMembership(db, campaignId, player.id, inGameDate)
  }
}

export function backfillQuestsForCampaign(db: Database.Database, campaignId: string): void {
  const threads = listStoryThreadsByCampaign(db, campaignId)
  const [primaryThread] = threads
  if (primaryThread) {
    seedMainQuestForCampaign(db, {
      campaignId,
      storyThreadId: primaryThread.id,
      title: primaryThread.title,
      summary: primaryThread.summary
    })
  }
  importSideQuestsFromQuestHooks(db, campaignId)
  const campaign = getCampaignById(db, campaignId)
  seedAllPlayerCharacterQuestMembership(db, campaignId, campaign?.inGameDate ?? 0)
}
