import type { PersonMatchCandidate } from './types'

/** Union candidate lists by `npcId`, keeping the first occurrence of each id. */
export function mergePersonMatchCandidates(
  ...groups: PersonMatchCandidate[][]
): PersonMatchCandidate[] {
  const byId = new Map<string, PersonMatchCandidate>()
  for (const group of groups) {
    for (const candidate of group) {
      if (!byId.has(candidate.npcId)) {
        byId.set(candidate.npcId, candidate)
      }
    }
  }
  return [...byId.values()]
}

/**
 * Social prose: drop the current message speaker so avatar/name chrome stays the
 * primary dossier entry for that NPC (epic 128).
 */
export function excludeSpeakerFromPersonCandidates(
  candidates: PersonMatchCandidate[],
  speakerNpcId: string | null | undefined
): PersonMatchCandidate[] {
  if (!speakerNpcId) {
    return candidates
  }
  return candidates.filter((candidate) => candidate.npcId !== speakerNpcId)
}
