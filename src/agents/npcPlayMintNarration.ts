import type Database from 'better-sqlite3'
import { getFactionById, getFactionByKey } from '../db/repositories/factions'
import { createNpc, type Npc } from '../db/repositories/npcs'
import { getRegionById, listRegionsByCampaign } from '../db/repositories/regions'
import {
  clampNpcProposals,
  findExistingNpcForProposal,
  slugifyLabel,
  type NpcProposal
} from '../shared/playPopulation'
import type { NarrationResult } from './dm'

interface NpcPlayMintSideEffectInput {
  campaignId: string
  regionId: string
  characterId: string
}

function resolveRegionId(
  db: Database.Database,
  campaignId: string,
  proposal: NpcProposal,
  fallbackRegionId: string
): string {
  if (proposal.regionId) {
    const byId = getRegionById(db, proposal.regionId)
    if (byId && byId.campaignId === campaignId) {
      return byId.id
    }
  }
  if (proposal.regionKey) {
    const key = slugifyLabel(proposal.regionKey)
    const match = listRegionsByCampaign(db, campaignId).find(
      (region) => slugifyLabel(region.name) === key || region.id === proposal.regionKey
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

function resolveFactionId(
  db: Database.Database,
  campaignId: string,
  factionId: string | undefined,
  factionKey: string | undefined
): string | null {
  if (factionId) {
    const byId = getFactionById(db, factionId)
    if (byId && byId.campaignId === campaignId) {
      return byId.id
    }
  }
  if (factionKey) {
    return getFactionByKey(db, campaignId, factionKey)?.id ?? null
  }
  return null
}

function buildCreateNpcInput(
  input: NpcPlayMintSideEffectInput,
  proposal: NpcProposal,
  regionId: string,
  factionId: string | null
) {
  const canSpeak = proposal.canSpeak !== false
  return {
    campaignId: input.campaignId,
    regionId,
    name: proposal.name.trim(),
    role: proposal.role.trim(),
    disposition: proposal.disposition.trim(),
    canSpeak,
    backstory: proposal.backstory ?? '',
    ...(proposal.temperament !== undefined ? { temperament: proposal.temperament } : {}),
    ...(proposal.alignment !== undefined ? { alignment: proposal.alignment } : {}),
    ...(proposal.raceKey !== undefined ? { raceKey: proposal.raceKey } : {}),
    ...(proposal.backgroundKey !== undefined ? { backgroundKey: proposal.backgroundKey } : {}),
    ...(proposal.genderKey !== undefined ? { genderKey: proposal.genderKey } : {}),
    ...(proposal.classKey !== undefined ? { classKey: proposal.classKey } : {}),
    ...(factionId !== null ? { factionId } : {}),
    ...(proposal.factionMembershipRole !== undefined
      ? { factionMembershipRole: proposal.factionMembershipRole }
      : {})
  }
}

function persistNpcProposal(
  db: Database.Database,
  input: NpcPlayMintSideEffectInput,
  proposal: NpcProposal
): Npc | undefined {
  const regionId = resolveRegionId(db, input.campaignId, proposal, input.regionId)
  const existing = findExistingNpcForProposal(db, input.campaignId, regionId, proposal)
  if (existing) {
    return existing
  }

  const factionId = resolveFactionId(
    db,
    input.campaignId,
    proposal.factionId,
    proposal.factionKey
  )

  return createNpc(db, buildCreateNpcInput(input, proposal, regionId, factionId))
}

export function persistNpcPlayMintSideEffects(
  db: Database.Database,
  result: Pick<NarrationResult, 'npcProposals'>,
  input: NpcPlayMintSideEffectInput
): void {
  const proposals = clampNpcProposals(result.npcProposals)
  for (const proposal of proposals) {
    persistNpcProposal(db, input, proposal)
  }
}
