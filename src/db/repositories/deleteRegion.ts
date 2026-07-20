import type Database from 'better-sqlite3'
import { getRegionById } from './regions'

export function deleteRegionCascade(db: Database.Database, regionId: string): void {
  const region = getRegionById(db, regionId)
  if (!region) {
    throw new Error(`Region "${regionId}" not found`)
  }

  const run = db.transaction(() => {
    db.prepare(
      `DELETE FROM character_quests
       WHERE quest_id IN (
         SELECT id FROM quests
         WHERE region_id = ?
            OR source_world_fact_id IN (SELECT id FROM world_facts WHERE region_id = ?)
       )`
    ).run(regionId, regionId)
    db.prepare(
      `DELETE FROM quests
       WHERE region_id = ?
          OR source_world_fact_id IN (SELECT id FROM world_facts WHERE region_id = ?)`
    ).run(regionId, regionId)
    db.prepare(
      `UPDATE characters SET source_npc_id = NULL
       WHERE source_npc_id IN (SELECT id FROM npcs WHERE region_id = ?)`
    ).run(regionId)
    db.prepare(
      `DELETE FROM npc_memories
       WHERE npc_id IN (SELECT id FROM npcs WHERE region_id = ?)`
    ).run(regionId)
    db.prepare('DELETE FROM rag_chunks WHERE region_id = ?').run(regionId)
    db.prepare(
      `DELETE FROM rag_chunks
       WHERE npc_id IN (SELECT id FROM npcs WHERE region_id = ?)`
    ).run(regionId)
    db.prepare('DELETE FROM npcs WHERE region_id = ?').run(regionId)
    db.prepare('DELETE FROM world_facts WHERE region_id = ?').run(regionId)
    db.prepare('DELETE FROM region_history WHERE region_id = ?').run(regionId)
    db.prepare('DELETE FROM regions WHERE id = ?').run(regionId)
  })
  run()
}
