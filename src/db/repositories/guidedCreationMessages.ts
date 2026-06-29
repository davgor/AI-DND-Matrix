import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { GuidedCreationMessage, GuidedMessagePhase, GuidedMessageRole } from '../../shared/guidedCreation/types'

interface MessageRow {
  id: string
  campaign_id: string
  character_id: string
  phase: GuidedMessagePhase
  role: GuidedMessageRole
  content: string
  created_at: string
}

function rowToMessage(row: MessageRow): GuidedCreationMessage {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    characterId: row.character_id,
    phase: row.phase,
    role: row.role,
    content: row.content,
    createdAt: row.created_at
  }
}

export interface AppendGuidedMessageInput {
  campaignId: string
  characterId: string
  phase: GuidedMessagePhase
  role: GuidedMessageRole
  content: string
  createdAt?: string
}

export function appendGuidedCreationMessage(
  db: Database.Database,
  input: AppendGuidedMessageInput
): GuidedCreationMessage {
  const id = randomUUID()
  const createdAt = input.createdAt ?? new Date().toISOString()
  db.prepare(
    `INSERT INTO guided_creation_messages
      (id, campaign_id, character_id, phase, role, content, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, input.campaignId, input.characterId, input.phase, input.role, input.content, createdAt)
  return {
    id,
    campaignId: input.campaignId,
    characterId: input.characterId,
    phase: input.phase,
    role: input.role,
    content: input.content,
    createdAt
  }
}

export function listGuidedCreationMessagesByCharacter(
  db: Database.Database,
  characterId: string
): GuidedCreationMessage[] {
  const rows = db
    .prepare(
      'SELECT * FROM guided_creation_messages WHERE character_id = ? ORDER BY created_at ASC, rowid ASC'
    )
    .all(characterId) as MessageRow[]
  return rows.map(rowToMessage)
}

export function listGuidedCreationMessagesByPhase(
  db: Database.Database,
  characterId: string,
  phase: GuidedMessagePhase
): GuidedCreationMessage[] {
  const rows = db
    .prepare(
      `SELECT * FROM guided_creation_messages
       WHERE character_id = ? AND phase = ?
       ORDER BY created_at ASC, rowid ASC`
    )
    .all(characterId, phase) as MessageRow[]
  return rows.map(rowToMessage)
}
