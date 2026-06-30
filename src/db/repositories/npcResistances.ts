import type Database from 'better-sqlite3'
import type { ResistanceProfile } from '../../engine/damage'
import { getCreatureByKey } from '../catalog/creatures'
import type { Npc } from './npcs'

export function resolveNpcResistanceProfile(db: Database.Database, npc: Npc): ResistanceProfile {
  if (!npc.catalogCreatureKey) {
    return {}
  }
  const creature = getCreatureByKey(db, npc.catalogCreatureKey)
  return creature?.resistances ?? {}
}
