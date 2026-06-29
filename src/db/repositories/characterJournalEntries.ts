import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type {
  CharacterJournalEntry,
  CreateCharacterJournalEntryInput
} from '../../shared/journal/types'

interface CharacterJournalEntryRow {
  id: string
  campaign_id: string
  character_id: string
  content: string
  in_game_date: number
  created_at: string
}

function rowToEntry(row: CharacterJournalEntryRow): CharacterJournalEntry {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    characterId: row.character_id,
    content: row.content,
    inGameDate: row.in_game_date,
    createdAt: row.created_at
  }
}

export function createCharacterJournalEntry(
  db: Database.Database,
  input: CreateCharacterJournalEntryInput
): CharacterJournalEntry {
  const id = randomUUID()
  const createdAt = input.createdAt ?? new Date().toISOString()
  db.prepare(
    `INSERT INTO character_journal_entries (
      id, campaign_id, character_id, content, in_game_date, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, input.campaignId, input.characterId, input.content, input.inGameDate, createdAt)
  return {
    id,
    campaignId: input.campaignId,
    characterId: input.characterId,
    content: input.content,
    inGameDate: input.inGameDate,
    createdAt
  }
}

export function listCharacterJournalEntries(
  db: Database.Database,
  characterId: string
): CharacterJournalEntry[] {
  const rows = db
    .prepare(
      `SELECT * FROM character_journal_entries
       WHERE character_id = ?
       ORDER BY in_game_date DESC, created_at DESC`
    )
    .all(characterId) as CharacterJournalEntryRow[]
  return rows.map(rowToEntry)
}
