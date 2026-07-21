import type Database from 'better-sqlite3'
import type { Character } from '../db/repositories/characters'
import { listPartyMembersForPlayer } from '../db/repositories/characters'
import { markCombatantExited, type CombatEncounter } from '../db/repositories/combatEncounters'
import type { CombatantRef } from '../shared/combat/types'

function companionShouldFollow(member: Character): boolean {
  if (member.lifeStatus !== 'alive') {
    return false
  }
  if (member.hp <= 0) {
    return false
  }
  const leftBehind = (member.stats as { leftBehind?: boolean }).leftBehind === true
  return !leftBehind
}

/** Living owned companions exit with the player on successful flee (129.8). */
export function markOwnedCompanionsExitedOnFlee(
  db: Database.Database,
  encounter: CombatEncounter,
  ownerPlayerCharacterId: string
): void {
  const members = listPartyMembersForPlayer(db, ownerPlayerCharacterId)
  let exited = encounter.exitedCombatantIds
  for (const member of members) {
    if (!companionShouldFollow(member)) {
      continue
    }
    const ref: CombatantRef = { kind: 'ai_party_member', id: member.id }
    const already = exited.some((entry) => entry.kind === ref.kind && entry.id === ref.id)
    if (already) {
      continue
    }
    markCombatantExited(db, encounter.id, ref, exited)
    exited = [...exited, ref]
  }
}
