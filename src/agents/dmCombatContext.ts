import type Database from 'better-sqlite3'
import { getNpcById } from '../db/repositories/npcs'
import type { CombatEncounter } from '../db/repositories/combatEncounters'

export function buildCombatSummaryForNarration(
  db: Database.Database,
  encounter: CombatEncounter | null | undefined
) {
  if (!encounter) {
    return undefined
  }
  const activeKind = encounter.initiativeOrder[encounter.activeTurnIndex]?.combatant.kind
  return {
    round: encounter.round,
    activeCombatantName: activeKind === 'player' ? 'Player' : 'Opponent',
    visibleCombatants: encounter.participantIds
      .filter((ref) => ref.kind === 'npc')
      .map((ref) => {
        const npc = getNpcById(db, ref.id)
        return { name: npc?.name ?? 'Unknown', hp: npc?.hp ?? 0, maxHp: npc?.maxHp ?? 0 }
      })
  }
}
