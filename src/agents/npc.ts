import type Database from 'better-sqlite3'
import type { Npc } from '../db/repositories/npcs'
import type { NpcMemory } from '../db/repositories/npcMemories'
import { listNpcMemoriesByNpc } from '../db/repositories/npcMemories'
import type { WorldFact } from '../db/repositories/worldFacts'
import { listWorldFactsByRegionOrFaction } from '../db/repositories/worldFacts'
import { takeRecent } from './contextWindow'

export interface NpcContext {
  npcId: string
  memories: NpcMemory[]
  worldFacts: WorldFact[]
}

export function assembleNpcContext(db: Database.Database, npc: Npc): NpcContext {
  const memories = takeRecent(listNpcMemoriesByNpc(db, npc.id))
  const worldFacts = listWorldFactsByRegionOrFaction(db, npc.campaignId, npc.regionId)
  return { npcId: npc.id, memories, worldFacts }
}
