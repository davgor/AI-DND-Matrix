import type { Character } from '../db/repositories/characters'
import type { CharacterPerkStats } from '../engine/perks'
import type { PendingLevelUpCeremony } from '../shared/progression/types'

export function readPerkStats(character: Character): CharacterPerkStats {
  return character.stats as CharacterPerkStats
}

export function writePerkStats(character: Character, patch: CharacterPerkStats): void {
  character.stats = { ...character.stats, ...patch }
}

export function getPendingLevelUpQueue(character: Character): PendingLevelUpCeremony[] {
  const queue = readPerkStats(character).pendingLevelUpQueue
  if (!Array.isArray(queue)) {
    return []
  }
  return queue as PendingLevelUpCeremony[]
}

export function hasPendingLevelUp(character: Character): boolean {
  return getPendingLevelUpQueue(character).length > 0
}
