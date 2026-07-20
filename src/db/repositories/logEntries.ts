import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { CreateLogEntryInput, LogCategory, LogEntry } from '../../shared/logBook/types'

interface LogEntryRow {
  id: string
  campaign_id: string
  character_id: string
  category: LogCategory
  title: string
  content: string
  related_entity_id: string | null
  learned_in_game_date: number
  created_at: string
}

function rowToEntry(row: LogEntryRow): LogEntry {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    characterId: row.character_id,
    category: row.category,
    title: row.title,
    content: row.content,
    relatedEntityId: row.related_entity_id,
    learnedInGameDate: row.learned_in_game_date,
    createdAt: row.created_at
  }
}

export function createLogEntry(db: Database.Database, input: CreateLogEntryInput): LogEntry {
  const id = randomUUID()
  const createdAt = input.createdAt ?? new Date().toISOString()
  db.prepare(
    `INSERT INTO log_entries (
      id, campaign_id, character_id, category, title, content,
      related_entity_id, learned_in_game_date, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.campaignId,
    input.characterId,
    input.category,
    input.title,
    input.content,
    input.relatedEntityId ?? null,
    input.learnedInGameDate,
    createdAt
  )
  return {
    id,
    campaignId: input.campaignId,
    characterId: input.characterId,
    category: input.category,
    title: input.title,
    content: input.content,
    relatedEntityId: input.relatedEntityId ?? null,
    learnedInGameDate: input.learnedInGameDate,
    createdAt
  }
}

export function listLogEntriesByCharacter(db: Database.Database, characterId: string): LogEntry[] {
  const rows = db
    .prepare(
      'SELECT * FROM log_entries WHERE character_id = ? ORDER BY learned_in_game_date DESC, created_at DESC'
    )
    .all(characterId) as LogEntryRow[]
  return rows.map(rowToEntry)
}

export function listLogEntriesByCharacterAndCategory(
  db: Database.Database,
  characterId: string,
  category: LogCategory
): LogEntry[] {
  const rows = db
    .prepare(
      `SELECT * FROM log_entries
       WHERE character_id = ? AND category = ?
       ORDER BY learned_in_game_date DESC, created_at DESC`
    )
    .all(characterId, category) as LogEntryRow[]
  return rows.map(rowToEntry)
}

export function listLogEntriesRelatedToEntity(
  db: Database.Database,
  characterId: string,
  relatedEntityId: string
): LogEntry[] {
  const rows = db
    .prepare(
      `SELECT * FROM log_entries
       WHERE character_id = ? AND related_entity_id = ?
       ORDER BY learned_in_game_date DESC, created_at DESC`
    )
    .all(characterId, relatedEntityId) as LogEntryRow[]
  return rows.map(rowToEntry)
}

export function getLogEntryById(db: Database.Database, id: string): LogEntry | undefined {
  const row = db.prepare('SELECT * FROM log_entries WHERE id = ?').get(id) as LogEntryRow | undefined
  return row ? rowToEntry(row) : undefined
}

export interface UpdateLogEntryInput {
  title?: string
  content?: string
  category?: LogCategory
  relatedEntityId?: string | null
}

export function updateLogEntryForCharacter(
  db: Database.Database,
  characterId: string,
  entryId: string,
  updates: UpdateLogEntryInput
): LogEntry | null {
  const existing = getLogEntryById(db, entryId)
  if (!existing || existing.characterId !== characterId) {
    return null
  }
  const title = updates.title ?? existing.title
  const content = updates.content ?? existing.content
  const category = updates.category ?? existing.category
  const relatedEntityId =
    updates.relatedEntityId !== undefined ? updates.relatedEntityId : existing.relatedEntityId
  db.prepare(
    `UPDATE log_entries SET title = ?, content = ?, category = ?, related_entity_id = ? WHERE id = ? AND character_id = ?`
  ).run(title, content, category, relatedEntityId, entryId, characterId)
  return getLogEntryById(db, entryId) ?? null
}

export function deleteLogEntryForCharacter(
  db: Database.Database,
  characterId: string,
  entryId: string
): boolean {
  const result = db
    .prepare('DELETE FROM log_entries WHERE id = ? AND character_id = ?')
    .run(entryId, characterId)
  return result.changes > 0
}
