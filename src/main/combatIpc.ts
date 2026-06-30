import { ipcMain } from 'electron'
import { getActiveEncounter } from '../db/repositories/combatEncounters'
import { buildCombatStateSnapshot } from './combatSnapshot'
import { getDb } from './db'
import type { CombatStateSnapshot } from '../shared/combat/types'

export function getCombatState(campaignId: string): CombatStateSnapshot | null {
  const db = getDb()
  const encounter = getActiveEncounter(db, campaignId)
  if (!encounter) {
    return null
  }
  return buildCombatStateSnapshot(db, encounter)
}

export function registerCombatHandlers(): void {
  ipcMain.handle('combat:getState', (_event, campaignId: string) => getCombatState(campaignId))
}
