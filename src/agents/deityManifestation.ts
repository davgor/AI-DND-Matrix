import type Database from 'better-sqlite3'
import { listDeitiesByCampaign, type Deity } from '../db/repositories/deities'
import {
  findDivineManifestationNpc,
  listFactionsByCampaign
} from '../db/repositories/factions'
import { createNpc, type Npc } from '../db/repositories/npcs'
import { getRegionById, listRegionsByCampaign } from '../db/repositories/regions'
import type { DeityManifestationProposal } from '../shared/factions'
import type { Temperament } from '../shared/alignment/types'

export interface EnsureDeityManifestationInput {
  campaignId: string
  proposal: DeityManifestationProposal
  /** Region used when proposal.regionId is absent or invalid */
  fallbackRegionId?: string
}

export type EnsureDeityManifestationResult =
  | { status: 'created' | 'reused'; npc: Npc }
  | { status: 'rejected'; reason: 'missing_deity' | 'missing_region' }

function slugifyLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function resolveDeity(
  db: Database.Database,
  campaignId: string,
  proposal: DeityManifestationProposal
): Deity | undefined {
  const deities = listDeitiesByCampaign(db, campaignId)
  if (proposal.deityId) {
    const byId = deities.find((deity) => deity.id === proposal.deityId)
    if (byId) {
      return byId
    }
  }
  if (!proposal.deityKey) {
    return undefined
  }
  const key = proposal.deityKey
  return deities.find((deity) => slugifyLabel(deity.name) === key || deity.id === key)
}

function resolveManifestationRegionId(
  db: Database.Database,
  campaignId: string,
  proposal: DeityManifestationProposal,
  fallbackRegionId: string | undefined
): string | undefined {
  if (proposal.regionId) {
    const region = getRegionById(db, proposal.regionId)
    if (region && region.campaignId === campaignId) {
      return region.id
    }
  }
  if (fallbackRegionId) {
    const fallback = getRegionById(db, fallbackRegionId)
    if (fallback && fallback.campaignId === campaignId) {
      return fallback.id
    }
  }
  return listRegionsByCampaign(db, campaignId)[0]?.id
}

function findPrimaryReligiousFactionId(
  db: Database.Database,
  campaignId: string,
  deityId: string
): string | null {
  const match = listFactionsByCampaign(db, campaignId).find(
    (faction) => faction.kind === 'religious' && faction.deityId === deityId
  )
  return match?.id ?? null
}

function dispositionForDeity(deity: Deity): string {
  if (deity.isForgotten) {
    return 'hollow'
  }
  return deity.domains[0] ? `solemn (${deity.domains[0]})` : 'solemn'
}

function temperamentForDeity(deity: Deity): Temperament {
  return deity.isForgotten ? 'cunning' : 'disciplined'
}

function createManifestationNpc(
  db: Database.Database,
  input: {
    campaignId: string
    regionId: string
    deity: Deity
    factionId: string | null
  }
): Npc {
  const { campaignId, regionId, deity, factionId } = input
  return createNpc(db, {
    campaignId,
    regionId,
    name: deity.name,
    role: deity.epithet || 'divine manifestation',
    disposition: dispositionForDeity(deity),
    temperament: temperamentForDeity(deity),
    canSpeak: true,
    backstory: deity.blurb,
    factionId,
    factionMembershipRole: factionId ? 'manifestation' : null,
    deityId: deity.id,
    isDivineManifestation: true
  })
}

export function ensureDeityManifestationNpc(
  db: Database.Database,
  input: EnsureDeityManifestationInput
): EnsureDeityManifestationResult {
  const deity = resolveDeity(db, input.campaignId, input.proposal)
  if (!deity) {
    return { status: 'rejected', reason: 'missing_deity' }
  }

  const existing = findDivineManifestationNpc(db, input.campaignId, deity.id)
  if (existing) {
    return { status: 'reused', npc: existing }
  }

  const regionId = resolveManifestationRegionId(
    db,
    input.campaignId,
    input.proposal,
    input.fallbackRegionId
  )
  if (!regionId) {
    return { status: 'rejected', reason: 'missing_region' }
  }

  const npc = createManifestationNpc(db, {
    campaignId: input.campaignId,
    regionId,
    deity,
    factionId: findPrimaryReligiousFactionId(db, input.campaignId, deity.id)
  })
  return { status: 'created', npc }
}

export function persistDeityManifestationSideEffect(
  db: Database.Database,
  proposal: DeityManifestationProposal | undefined,
  input: { campaignId: string; fallbackRegionId: string }
): EnsureDeityManifestationResult | undefined {
  if (!proposal) {
    return undefined
  }
  return ensureDeityManifestationNpc(db, {
    campaignId: input.campaignId,
    proposal,
    fallbackRegionId: input.fallbackRegionId
  })
}
