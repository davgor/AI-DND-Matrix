import type Database from 'better-sqlite3'
import {
  applyCharacterFactionReputationDelta,
  createFaction,
  getFactionById,
  getFactionByKey,
  listFactionsByCampaign,
  setNpcFactionMembership,
  upsertFactionRelation
} from '../db/repositories/factions'
import { listDeitiesByCampaign } from '../db/repositories/deities'
import { getNpcById } from '../db/repositories/npcs'
import { getRegionById, listRegionsByCampaign } from '../db/repositories/regions'
import {
  isFactionKind,
  isFactionRelationStance,
  type FactionProposal,
  type NpcFactionUpdateProposal,
  type RelationUpdateProposal,
  type ReputationUpdateProposal
} from '../shared/factions'
import type { NarrationResult } from './dm'

export interface FactionSideEffectInput {
  campaignId: string
  characterId: string
}

function slugifyLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function resolveFactionId(
  db: Database.Database,
  campaignId: string,
  factionId: string | undefined,
  factionKey: string | undefined
): string | undefined {
  if (factionId) {
    const byId = getFactionById(db, factionId)
    if (byId && byId.campaignId === campaignId) {
      return byId.id
    }
  }
  if (factionKey) {
    return getFactionByKey(db, campaignId, factionKey)?.id
  }
  return undefined
}

function resolveDeityId(
  db: Database.Database,
  campaignId: string,
  proposal: FactionProposal
): string | null {
  const deities = listDeitiesByCampaign(db, campaignId)
  if (proposal.deityId) {
    const byId = deities.find((deity) => deity.id === proposal.deityId)
    if (byId) {
      return byId.id
    }
  }
  if (proposal.deityKey) {
    const key = proposal.deityKey
    const byKey = deities.find(
      (deity) => slugifyLabel(deity.name) === key || deity.id === key
    )
    return byKey?.id ?? null
  }
  return null
}

function resolveHomeRegionId(
  db: Database.Database,
  campaignId: string,
  proposal: FactionProposal
): string | null {
  if (proposal.homeRegionId) {
    const region = getRegionById(db, proposal.homeRegionId)
    if (region && region.campaignId === campaignId) {
      return region.id
    }
  }
  if (proposal.homeRegionKey) {
    const key = proposal.homeRegionKey
    const match = listRegionsByCampaign(db, campaignId).find(
      (region) => slugifyLabel(region.name) === key || region.id === key
    )
    return match?.id ?? null
  }
  return null
}

function isValidFactionProposal(value: unknown): value is FactionProposal {
  if (!value || typeof value !== 'object') {
    return false
  }
  const body = value as Record<string, unknown>
  return (
    typeof body.key === 'string' &&
    body.key.length > 0 &&
    typeof body.name === 'string' &&
    typeof body.summary === 'string' &&
    isFactionKind(body.kind)
  )
}

function persistFactionProposal(
  db: Database.Database,
  campaignId: string,
  proposal: FactionProposal
): void {
  if (!isValidFactionProposal(proposal)) {
    return
  }
  if (getFactionByKey(db, campaignId, proposal.key)) {
    return
  }
  const existingCount = listFactionsByCampaign(db, campaignId).length
  createFaction(db, {
    campaignId,
    key: proposal.key,
    name: proposal.name,
    kind: proposal.kind,
    summary: proposal.summary,
    motivation: proposal.motivation ?? null,
    publicFace: proposal.publicFace ?? null,
    methods: proposal.methods ?? null,
    deityId: resolveDeityId(db, campaignId, proposal),
    homeRegionId: resolveHomeRegionId(db, campaignId, proposal),
    sortOrder: existingCount,
    source: 'dm_play'
  })
}

function isValidReputationUpdate(value: unknown): value is ReputationUpdateProposal {
  if (!value || typeof value !== 'object') {
    return false
  }
  const body = value as Record<string, unknown>
  return typeof body.characterId === 'string' && typeof body.delta === 'number'
}

function persistReputationUpdate(
  db: Database.Database,
  campaignId: string,
  activeCharacterId: string,
  update: ReputationUpdateProposal
): void {
  if (!isValidReputationUpdate(update)) {
    return
  }
  if (update.characterId !== activeCharacterId) {
    return
  }
  const factionId = resolveFactionId(db, campaignId, update.factionId, update.factionKey)
  if (!factionId) {
    return
  }
  applyCharacterFactionReputationDelta(db, {
    characterId: activeCharacterId,
    factionId,
    delta: update.delta,
    reason: update.reason ?? null
  })
}

function isValidRelationUpdate(value: unknown): value is RelationUpdateProposal {
  if (!value || typeof value !== 'object') {
    return false
  }
  const body = value as Record<string, unknown>
  return isFactionRelationStance(body.stance)
}

function persistRelationUpdate(
  db: Database.Database,
  campaignId: string,
  update: RelationUpdateProposal
): void {
  if (!isValidRelationUpdate(update)) {
    return
  }
  const factionAId = resolveFactionId(db, campaignId, update.factionAId, update.factionAKey)
  const factionBId = resolveFactionId(db, campaignId, update.factionBId, update.factionBKey)
  if (!factionAId || !factionBId || factionAId === factionBId) {
    return
  }
  upsertFactionRelation(db, {
    campaignId,
    factionAId,
    factionBId,
    stance: update.stance,
    summary: update.summary ?? null
  })
}

function resolveNpcFactionId(
  db: Database.Database,
  campaignId: string,
  update: NpcFactionUpdateProposal
): string | null {
  if (update.factionId === null || update.factionKey === null) {
    return null
  }
  if (update.factionId === undefined && update.factionKey === undefined) {
    return null
  }
  return resolveFactionId(
    db,
    campaignId,
    update.factionId ?? undefined,
    update.factionKey ?? undefined
  ) ?? null
}

function persistNpcFactionUpdate(
  db: Database.Database,
  campaignId: string,
  update: NpcFactionUpdateProposal
): void {
  if (!update.npcId || typeof update.npcId !== 'string') {
    return
  }
  const npc = getNpcById(db, update.npcId)
  if (!npc || npc.campaignId !== campaignId) {
    return
  }
  const factionId = resolveNpcFactionId(db, campaignId, update)
  const membershipRole =
    factionId === null ? null : (update.membershipRole ?? npc.factionMembershipRole)
  setNpcFactionMembership(db, npc.id, {
    factionId,
    membershipRole: factionId === null ? null : membershipRole
  })
}

export function persistFactionNarrationSideEffects(
  db: Database.Database,
  result: NarrationResult,
  input: FactionSideEffectInput
): void {
  for (const proposal of result.factionProposals ?? []) {
    persistFactionProposal(db, input.campaignId, proposal)
  }
  for (const update of result.reputationUpdates ?? []) {
    persistReputationUpdate(db, input.campaignId, input.characterId, update)
  }
  for (const update of result.relationUpdates ?? []) {
    persistRelationUpdate(db, input.campaignId, update)
  }
  for (const update of result.npcFactionUpdates ?? []) {
    persistNpcFactionUpdate(db, input.campaignId, update)
  }
}
