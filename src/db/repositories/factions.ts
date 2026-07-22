import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import {
  applyReputationDelta,
  bandForReputationScore,
  canonicalFactionPair,
  isFactionKind,
  isFactionRelationStance,
  isFactionSource,
  type CharacterFactionReputation,
  type Faction,
  type FactionKind,
  type FactionRelation,
  type FactionRelationStance,
  type FactionSource
} from '../../shared/factions'
import { getNpcById, type Npc } from './npcs'

export interface CreateFactionInput {
  campaignId: string
  key: string
  name: string
  kind: FactionKind
  summary: string
  motivation?: string | null
  publicFace?: string | null
  methods?: string | null
  deityId?: string | null
  homeRegionId?: string | null
  sortOrder: number
  source: FactionSource
  createdAt?: string
}

export interface CreateFactionRelationInput {
  campaignId: string
  factionAId: string
  factionBId: string
  stance: FactionRelationStance
  summary?: string | null
  updatedAt?: string
}

export interface ApplyReputationDeltaInput {
  characterId: string
  factionId: string
  delta: number
  reason?: string | null
}

export interface SetNpcFactionMembershipInput {
  factionId: string | null
  membershipRole: string | null
}

interface FactionRow {
  id: string
  campaign_id: string
  key: string
  name: string
  kind: string
  summary: string
  motivation: string | null
  public_face: string | null
  methods: string | null
  deity_id: string | null
  home_region_id: string | null
  sort_order: number
  created_at: string
  source: string
}

interface FactionRelationRow {
  id: string
  campaign_id: string
  faction_a_id: string
  faction_b_id: string
  stance: string
  summary: string | null
  updated_at: string
}

interface ReputationRow {
  character_id: string
  faction_id: string
  score: number
  band: string
  updated_at: string
  last_reason: string | null
}

function requireFactionKind(value: string): FactionKind {
  if (!isFactionKind(value)) {
    throw new Error(`Invalid faction kind: ${value}`)
  }
  return value
}

function requireFactionSource(value: string): FactionSource {
  if (!isFactionSource(value)) {
    throw new Error(`Invalid faction source: ${value}`)
  }
  return value
}

function requireStance(value: string): FactionRelationStance {
  if (!isFactionRelationStance(value)) {
    throw new Error(`Invalid faction relation stance: ${value}`)
  }
  return value
}

function rowToFaction(row: FactionRow): Faction {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    key: row.key,
    name: row.name,
    kind: requireFactionKind(row.kind),
    summary: row.summary,
    motivation: row.motivation,
    publicFace: row.public_face,
    methods: row.methods,
    deityId: row.deity_id,
    homeRegionId: row.home_region_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    source: requireFactionSource(row.source)
  }
}

function rowToRelation(row: FactionRelationRow): FactionRelation {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    factionAId: row.faction_a_id,
    factionBId: row.faction_b_id,
    stance: requireStance(row.stance),
    summary: row.summary,
    updatedAt: row.updated_at
  }
}

function rowToReputation(row: ReputationRow): CharacterFactionReputation {
  return {
    characterId: row.character_id,
    factionId: row.faction_id,
    score: row.score,
    band: bandForReputationScore(row.score),
    updatedAt: row.updated_at,
    lastReason: row.last_reason
  }
}

function requireCanonicalPair(factionAId: string, factionBId: string) {
  const pair = canonicalFactionPair(factionAId, factionBId)
  if (!pair) {
    throw new Error('Faction relation self-edges are forbidden')
  }
  return pair
}

export function createFaction(db: Database.Database, input: CreateFactionInput): Faction {
  const id = randomUUID()
  const createdAt = input.createdAt ?? new Date().toISOString()
  db.prepare(
    `INSERT INTO factions (
       id, campaign_id, key, name, kind, summary, motivation, public_face, methods,
       deity_id, home_region_id, sort_order, created_at, source
     ) VALUES (
       @id, @campaignId, @key, @name, @kind, @summary, @motivation, @publicFace, @methods,
       @deityId, @homeRegionId, @sortOrder, @createdAt, @source
     )`
  ).run({
    id,
    campaignId: input.campaignId,
    key: input.key,
    name: input.name,
    kind: input.kind,
    summary: input.summary,
    motivation: input.motivation ?? null,
    publicFace: input.publicFace ?? null,
    methods: input.methods ?? null,
    deityId: input.deityId ?? null,
    homeRegionId: input.homeRegionId ?? null,
    sortOrder: input.sortOrder,
    createdAt,
    source: input.source
  })
  return getFactionById(db, id) as Faction
}

export function listFactionsByCampaign(db: Database.Database, campaignId: string): Faction[] {
  const rows = db
    .prepare(
      `SELECT * FROM factions
       WHERE campaign_id = ?
       ORDER BY sort_order ASC, name ASC`
    )
    .all(campaignId) as FactionRow[]
  return rows.map(rowToFaction)
}

export function getFactionById(db: Database.Database, id: string): Faction | undefined {
  const row = db.prepare('SELECT * FROM factions WHERE id = ?').get(id) as FactionRow | undefined
  return row ? rowToFaction(row) : undefined
}

export function getFactionByKey(
  db: Database.Database,
  campaignId: string,
  key: string
): Faction | undefined {
  const row = db
    .prepare('SELECT * FROM factions WHERE campaign_id = ? AND key = ?')
    .get(campaignId, key) as FactionRow | undefined
  return row ? rowToFaction(row) : undefined
}

function insertFactionRelationRow(row: {
  db: Database.Database
  id: string
  input: CreateFactionRelationInput
  pair: { factionAId: string; factionBId: string }
  updatedAt: string
}): void {
  row.db
    .prepare(
      `INSERT INTO faction_relations (
       id, campaign_id, faction_a_id, faction_b_id, stance, summary, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      row.id,
      row.input.campaignId,
      row.pair.factionAId,
      row.pair.factionBId,
      row.input.stance,
      row.input.summary ?? null,
      row.updatedAt
    )
}

export function createFactionRelation(
  db: Database.Database,
  input: CreateFactionRelationInput
): FactionRelation {
  const pair = requireCanonicalPair(input.factionAId, input.factionBId)
  const id = randomUUID()
  const updatedAt = input.updatedAt ?? new Date().toISOString()
  insertFactionRelationRow({ db, id, input, pair, updatedAt })
  const row = db.prepare('SELECT * FROM faction_relations WHERE id = ?').get(id) as FactionRelationRow
  return rowToRelation(row)
}

export function listFactionRelationsByCampaign(
  db: Database.Database,
  campaignId: string
): FactionRelation[] {
  const rows = db
    .prepare(
      `SELECT * FROM faction_relations
       WHERE campaign_id = ?
       ORDER BY updated_at ASC`
    )
    .all(campaignId) as FactionRelationRow[]
  return rows.map(rowToRelation)
}

function findRelationByPair(
  db: Database.Database,
  campaignId: string,
  pair: { factionAId: string; factionBId: string }
): FactionRelationRow | undefined {
  return db
    .prepare(
      `SELECT * FROM faction_relations
       WHERE campaign_id = ? AND faction_a_id = ? AND faction_b_id = ?`
    )
    .get(campaignId, pair.factionAId, pair.factionBId) as FactionRelationRow | undefined
}

export function upsertFactionRelation(
  db: Database.Database,
  input: CreateFactionRelationInput
): FactionRelation {
  const pair = requireCanonicalPair(input.factionAId, input.factionBId)
  const existing = findRelationByPair(db, input.campaignId, pair)
  const updatedAt = input.updatedAt ?? new Date().toISOString()
  if (!existing) {
    return createFactionRelation(db, { ...input, updatedAt })
  }
  db.prepare(
    `UPDATE faction_relations
     SET stance = ?, summary = ?, updated_at = ?
     WHERE id = ?`
  ).run(input.stance, input.summary ?? null, updatedAt, existing.id)
  const row = db
    .prepare('SELECT * FROM faction_relations WHERE id = ?')
    .get(existing.id) as FactionRelationRow
  return rowToRelation(row)
}

export function getCharacterFactionReputation(
  db: Database.Database,
  characterId: string,
  factionId: string
): CharacterFactionReputation | undefined {
  const row = db
    .prepare(
      `SELECT * FROM character_faction_reputations
       WHERE character_id = ? AND faction_id = ?`
    )
    .get(characterId, factionId) as ReputationRow | undefined
  return row ? rowToReputation(row) : undefined
}

function insertReputationRow(row: {
  db: Database.Database
  input: ApplyReputationDeltaInput
  score: number
  band: string
  updatedAt: string
}): void {
  row.db
    .prepare(
      `INSERT INTO character_faction_reputations (
       character_id, faction_id, score, band, updated_at, last_reason
     ) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      row.input.characterId,
      row.input.factionId,
      row.score,
      row.band,
      row.updatedAt,
      row.input.reason ?? null
    )
}

function updateReputationRow(row: {
  db: Database.Database
  input: ApplyReputationDeltaInput
  score: number
  band: string
  updatedAt: string
}): void {
  row.db
    .prepare(
      `UPDATE character_faction_reputations
     SET score = ?, band = ?, updated_at = ?, last_reason = ?
     WHERE character_id = ? AND faction_id = ?`
    )
    .run(
      row.score,
      row.band,
      row.updatedAt,
      row.input.reason ?? null,
      row.input.characterId,
      row.input.factionId
    )
}

export function applyCharacterFactionReputationDelta(
  db: Database.Database,
  input: ApplyReputationDeltaInput
): CharacterFactionReputation {
  const existing = getCharacterFactionReputation(db, input.characterId, input.factionId)
  const currentScore = existing?.score ?? 0
  const next = applyReputationDelta(currentScore, input.delta)
  const updatedAt = new Date().toISOString()
  const reputationRow = { db, input, score: next.score, band: next.band, updatedAt }
  if (!existing) {
    insertReputationRow(reputationRow)
  } else {
    updateReputationRow(reputationRow)
  }
  return getCharacterFactionReputation(db, input.characterId, input.factionId) as CharacterFactionReputation
}

export function listCharacterFactionReputations(
  db: Database.Database,
  characterId: string
): CharacterFactionReputation[] {
  const rows = db
    .prepare(
      `SELECT * FROM character_faction_reputations
       WHERE character_id = ?
       ORDER BY updated_at ASC`
    )
    .all(characterId) as ReputationRow[]
  return rows.map(rowToReputation)
}

export function setNpcFactionMembership(
  db: Database.Database,
  npcId: string,
  input: SetNpcFactionMembershipInput
): void {
  db.prepare(
    `UPDATE npcs
     SET faction_id = ?, faction_membership_role = ?
     WHERE id = ?`
  ).run(input.factionId, input.membershipRole, npcId)
}

export function findDivineManifestationNpc(
  db: Database.Database,
  campaignId: string,
  deityId: string
): Npc | undefined {
  const row = db
    .prepare(
      `SELECT id FROM npcs
       WHERE campaign_id = ?
         AND deity_id = ?
         AND is_divine_manifestation = 1
       LIMIT 1`
    )
    .get(campaignId, deityId) as { id: string } | undefined
  return row ? getNpcById(db, row.id) : undefined
}
