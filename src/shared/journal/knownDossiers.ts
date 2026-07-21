import type { JournalKnownDossier } from './types'

export function toJournalKnownDossiers(
  npcs: { id: string; name: string; opinionSummary: string | null }[]
): JournalKnownDossier[] {
  return npcs
    .filter((npc) => npc.opinionSummary != null)
    .map((npc) => ({ npcId: npc.id, name: npc.name }))
}
