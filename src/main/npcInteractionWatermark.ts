import type Database from 'better-sqlite3'
import { bumpNpcPlayerInteractionAt } from '../db/repositories/npcs'

export function recordNpcPlayerInteraction(
  db: Database.Database,
  npcId: string,
  at: string = new Date().toISOString()
): void {
  bumpNpcPlayerInteractionAt(db, npcId, at)
}
