import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { AskDmMessage, AskDmRole } from '../../shared/askDm/types'

interface MessageRow {
  id: string
  campaign_id: string
  character_id: string
  role: AskDmRole
  content: string
  created_at: string
}

function rowToMessage(row: MessageRow): AskDmMessage {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    characterId: row.character_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at
  }
}

export interface AppendAskDmMessageInput {
  campaignId: string
  characterId: string
  role: AskDmRole
  content: string
  createdAt?: string
}

export function appendAskDmMessage(
  db: Database.Database,
  input: AppendAskDmMessageInput
): AskDmMessage {
  const id = randomUUID()
  const createdAt = input.createdAt ?? new Date().toISOString()
  db.prepare(
    `INSERT INTO ask_dm_messages
      (id, campaign_id, character_id, role, content, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, input.campaignId, input.characterId, input.role, input.content, createdAt)
  return {
    id,
    campaignId: input.campaignId,
    characterId: input.characterId,
    role: input.role,
    content: input.content,
    createdAt
  }
}

export function listAskDmMessagesByCharacter(
  db: Database.Database,
  characterId: string
): AskDmMessage[] {
  const rows = db
    .prepare(
      'SELECT * FROM ask_dm_messages WHERE character_id = ? ORDER BY created_at ASC, rowid ASC'
    )
    .all(characterId) as MessageRow[]
  return rows.map(rowToMessage)
}
