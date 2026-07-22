import { parseNpcProposal, parsePlaceProposal } from './validate'
import {
  MAX_NPC_PROPOSALS_PER_TURN,
  MAX_PLACE_PROPOSALS_PER_TURN,
  type NpcProposal,
  type PlaceProposal
} from './types'

/** Validate and cap npcProposals to the per-turn budget (epic 134). */
export function clampNpcProposals(proposals: unknown[] | undefined): NpcProposal[] {
  if (!proposals?.length) {
    return []
  }
  const clamped: NpcProposal[] = []
  for (const raw of proposals) {
    if (clamped.length >= MAX_NPC_PROPOSALS_PER_TURN) {
      break
    }
    const parsed = parseNpcProposal(raw)
    if (parsed !== undefined) {
      clamped.push(parsed)
    }
  }
  return clamped
}

/** Validate and cap placeProposals to the per-turn budget (ticket 141). */
export function clampPlaceProposals(proposals: unknown[] | undefined): PlaceProposal[] {
  if (!proposals?.length) {
    return []
  }
  const clamped: PlaceProposal[] = []
  for (const raw of proposals) {
    if (clamped.length >= MAX_PLACE_PROPOSALS_PER_TURN) {
      break
    }
    const parsed = parsePlaceProposal(raw)
    if (parsed !== undefined) {
      clamped.push(parsed)
    }
  }
  return clamped
}
