import type Database from 'better-sqlite3'
import type { DeathCause } from '../shared/campaignHub/types'
import { markCharacterDead } from '../db/repositories/characters'
import type { DyingResolutionStatus } from './dyingResolution'

export function deathCauseForDyingStatus(status: DyingResolutionStatus): DeathCause | null {
  if (status === 'permanently_dead') {
    return 'legendary_dying'
  }
  return null
}

export function deathCauseForRespawnExhausted(): DeathCause {
  return 'respawn_exhausted'
}

export function deathCauseForExecuteDefeat(): DeathCause {
  return 'execute_defeat'
}

export interface PersistDeathInput {
  db: Database.Database
  characterId: string
  deathCause: DeathCause | string
}

export function persistCharacterDeath(input: PersistDeathInput): void {
  markCharacterDead(input.db, {
    characterId: input.characterId,
    deathCause: input.deathCause
  })
}

export function persistDeathFromDyingStatus(
  db: Database.Database,
  characterId: string,
  status: DyingResolutionStatus,
  options?: { respawnExhausted?: boolean }
): void {
  if (status !== 'permanently_dead') {
    return
  }
  const cause = options?.respawnExhausted ? deathCauseForRespawnExhausted() : deathCauseForDyingStatus(status)
  if (!cause) {
    return
  }
  persistCharacterDeath({ db, characterId, deathCause: cause })
}
