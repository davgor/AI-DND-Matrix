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
