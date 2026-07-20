import type Database from 'better-sqlite3'
import { getNpcById } from './npcs'

export function deleteNpcCascade(db: Database.Database, npcId: string): void {
  const npc = getNpcById(db, npcId)
  if (!npc) {
    throw new Error(`NPC "${npcId}" not found`)
  }

  const run = db.transaction(() => {
    db.prepare('UPDATE characters SET source_npc_id = NULL WHERE source_npc_id = ?').run(npcId)
    db.prepare('DELETE FROM npc_memories WHERE npc_id = ?').run(npcId)
    db.prepare('DELETE FROM rag_chunks WHERE npc_id = ?').run(npcId)
    db.prepare('DELETE FROM npcs WHERE id = ?').run(npcId)
  })
  run()
}
