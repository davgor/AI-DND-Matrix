import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import {
  parseItemModificationPayload,
  serializeItemModificationPayload,
  type ItemModification,
  type ItemModificationKind,
  type ItemModificationPayload
} from '../../shared/weaponModifications/types'

interface ModificationRow {
  id: string
  character_item_id: string
  kind: ItemModificationKind
  payload: string
  created_at: string
}

function rowToModification(row: ModificationRow): ItemModification | undefined {
  const payload = parseItemModificationPayload(row.kind, JSON.parse(row.payload))
  if (!payload) {
    return undefined
  }
  return {
    id: row.id,
    characterItemId: row.character_item_id,
    kind: row.kind,
    payload,
    createdAt: row.created_at
  }
}

export function listModifications(db: Database.Database, characterItemId: string): ItemModification[] {
  const rows = db
    .prepare('SELECT * FROM character_item_modifications WHERE character_item_id = ? ORDER BY created_at')
    .all(characterItemId) as ModificationRow[]
  return rows
    .map((row) => rowToModification(row))
    .filter((row): row is ItemModification => row !== undefined)
}

export function addModification(
  db: Database.Database,
  characterItemId: string,
  kind: ItemModificationKind,
  payload: ItemModificationPayload
): ItemModification {
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  db.prepare(
    `INSERT INTO character_item_modifications (id, character_item_id, kind, payload, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, characterItemId, kind, serializeItemModificationPayload(payload), createdAt)
  return {
    id,
    characterItemId,
    kind,
    payload,
    createdAt
  }
}
