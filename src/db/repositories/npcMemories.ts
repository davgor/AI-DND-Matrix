import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

export interface NpcMemory {
  id: string
  npcId: string
  timestamp: string
  content: string
  tags: string[]
}

export interface AppendNpcMemoryInput {
  npcId: string
  content: string
  tags: string[]
  timestamp?: string
}

interface NpcMemoryRow {
  id: string
  npc_id: string
  timestamp: string
  content: string
  tags: string
}

function rowToMemory(row: NpcMemoryRow): NpcMemory {
  return {
    id: row.id,
    npcId: row.npc_id,
    timestamp: row.timestamp,
    content: row.content,
    tags: JSON.parse(row.tags) as string[]
  }
}

export function appendNpcMemory(db: Database.Database, input: AppendNpcMemoryInput): NpcMemory {
  const id = randomUUID()
  const timestamp = input.timestamp ?? new Date().toISOString()

  db.prepare(
    'INSERT INTO npc_memories (id, npc_id, timestamp, content, tags) VALUES (?, ?, ?, ?, ?)'
  ).run(id, input.npcId, timestamp, input.content, JSON.stringify(input.tags))

  return { id, npcId: input.npcId, timestamp, content: input.content, tags: input.tags }
}

export function listNpcMemoriesByNpc(
  db: Database.Database,
  npcId: string,
  limit?: number
): NpcMemory[] {
  if (limit === undefined) {
    const rows = db
      .prepare('SELECT * FROM npc_memories WHERE npc_id = ? ORDER BY rowid')
      .all(npcId) as NpcMemoryRow[]
    return rows.map(rowToMemory)
  }

  const rows = db
    .prepare('SELECT * FROM npc_memories WHERE npc_id = ? ORDER BY rowid DESC LIMIT ?')
    .all(npcId, limit) as NpcMemoryRow[]
  return rows.reverse().map(rowToMemory)
}
