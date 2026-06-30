import { ipcMain } from 'electron'
import type { PendingLevelUpCeremony } from '../shared/progression/types'
import { getCharacterById } from '../db/repositories/characters'
import { getDb } from './db'
import {
  getPendingLevelUpCeremony,
  submitPerkChoice
} from './progressionPipeline'
import { hasPendingLevelUp } from './progressionPendingState'

export interface PendingLevelUpResponse {
  characterId: string
  targetLevel: number
  narrationText: string
  perks: PendingLevelUpCeremony['perks']
}

export function getPendingLevelUpForCharacter(
  db: import('better-sqlite3').Database,
  characterId: string
): PendingLevelUpResponse | null {
  const ceremony = getPendingLevelUpCeremony(db, characterId)
  if (!ceremony) {
    return null
  }
  return {
    characterId,
    targetLevel: ceremony.targetLevel,
    narrationText: ceremony.narrationText,
    perks: ceremony.perks
  }
}

export function registerProgressionHandlers(): void {
  ipcMain.handle('progression:getPendingLevelUp', (_event, characterId: string) => {
    return getPendingLevelUpForCharacter(getDb(), characterId)
  })

  ipcMain.handle('progression:submitPerkChoice', (_event, characterId: string, perkId: string) => {
    const db = getDb()
    const result = submitPerkChoice(db, characterId, perkId)
    const character = getCharacterById(db, characterId)
    return {
      ...result,
      pending: character ? hasPendingLevelUp(character) : false,
      character: character ?? null
    }
  })
}
