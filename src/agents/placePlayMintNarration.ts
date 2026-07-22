import type Database from 'better-sqlite3'
import { createRegion, getRegionById, listRegionsByCampaign, type Region } from '../db/repositories/regions'
import {
  clampPlaceProposals,
  findExistingRegionForProposal,
  slugifyLabel,
  type PlaceProposal
} from '../shared/playPopulation'
import type { NarrationResult } from './dm'

interface PlacePlayMintSideEffectInput {
  campaignId: string
  regionId: string
  characterId: string
}

/**
 * Resolve optional parent region hints FK-safely.
 * Unknown id/key → fall back to the turn region (never throw).
 * Light mint (141) creates peer campaign regions; parent is not persisted
 * (no parent_region column — spatial nesting is world-grid territory).
 */
export function resolvePlaceParentRegionId(
  db: Database.Database,
  campaignId: string,
  proposal: PlaceProposal,
  fallbackRegionId: string
): string {
  if (proposal.parentRegionId) {
    const byId = getRegionById(db, proposal.parentRegionId)
    if (byId && byId.campaignId === campaignId) {
      return byId.id
    }
  }
  if (proposal.parentRegionKey) {
    const key = slugifyLabel(proposal.parentRegionKey)
    const match = listRegionsByCampaign(db, campaignId).find(
      (region) => slugifyLabel(region.name) === key || region.id === proposal.parentRegionKey
    )
    if (match) {
      return match.id
    }
  }
  const fallback = getRegionById(db, fallbackRegionId)
  if (fallback && fallback.campaignId === campaignId) {
    return fallback.id
  }
  return listRegionsByCampaign(db, campaignId)[0]?.id ?? fallbackRegionId
}

function persistPlaceProposal(
  db: Database.Database,
  input: PlacePlayMintSideEffectInput,
  proposal: PlaceProposal
): Region | undefined {
  // FK-safe parent resolve (no parent_region column yet — world-grid 142).
  void resolvePlaceParentRegionId(db, input.campaignId, proposal, input.regionId)

  const existing = findExistingRegionForProposal(db, input.campaignId, proposal)
  if (existing) {
    return existing
  }

  return createRegion(db, {
    campaignId: input.campaignId,
    name: proposal.name.trim(),
    description: proposal.description.trim()
  })
}

export function persistPlacePlayMintSideEffects(
  db: Database.Database,
  result: Pick<NarrationResult, 'placeProposals'>,
  input: PlacePlayMintSideEffectInput
): void {
  const proposals = clampPlaceProposals(result.placeProposals)
  for (const proposal of proposals) {
    persistPlaceProposal(db, input, proposal)
  }
}
