import type { Character } from '../db/repositories/characters'
import type { CharacterPerkStats } from '../engine/perks'
import type { PendingLevelUpCeremony } from '../shared/progression/types'

export function readPerkStats(character: Character): CharacterPerkStats {
  return (character.stats ?? {}) as CharacterPerkStats
}

export function writePerkStats(character: Character, patch: CharacterPerkStats): void {
  character.stats = { ...character.stats, ...patch }
}

function isRenderableCeremony(entry: unknown): entry is PendingLevelUpCeremony {
  if (!entry || typeof entry !== 'object') {
    return false
  }
  const perks = (entry as PendingLevelUpCeremony).perks
  return Array.isArray(perks) && perks.length > 0
}

/** Queue entries that can be shown / must block play. Drops corrupted empty-perk rows. */
export function getPendingLevelUpQueue(character: Character): PendingLevelUpCeremony[] {
  const queue = readPerkStats(character).pendingLevelUpQueue
  if (!Array.isArray(queue)) {
    return []
  }
  return queue.filter(isRenderableCeremony)
}

export function hasPendingLevelUp(character: Character): boolean {
  return getPendingLevelUpQueue(character).length > 0
}
