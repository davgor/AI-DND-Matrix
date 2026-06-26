import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

export interface WorldFact {
  id: string
  campaignId: string
  regionId: string | null
  factionTag: string | null
  content: string
  createdAt: string
}

export interface CreateWorldFactInput {
  campaignId: string
  content: string
  regionId?: string | null
  factionTag?: string | null
  createdAt?: string
}

interface WorldFactRow {
  id: string
  campaign_id: string
  region_id: string | null
  faction_tag: string | null
  content: string
  created_at: string
}

function rowToWorldFact(row: WorldFactRow): WorldFact {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    regionId: row.region_id,
    factionTag: row.faction_tag,
    content: row.content,
    createdAt: row.created_at
  }
}

export function createWorldFact(db: Database.Database, input: CreateWorldFactInput): WorldFact {
  const id = randomUUID()
  const regionId = input.regionId ?? null
  const factionTag = input.factionTag ?? null
  const createdAt = input.createdAt ?? new Date().toISOString()

  db.prepare(
    `INSERT INTO world_facts (id, campaign_id, region_id, faction_tag, content, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, input.campaignId, regionId, factionTag, input.content, createdAt)

  return {
    id,
    campaignId: input.campaignId,
    regionId,
    factionTag,
    content: input.content,
    createdAt
  }
}

export function listWorldFactsByRegionOrFaction(
  db: Database.Database,
  campaignId: string,
  tag: string
): WorldFact[] {
  const rows = db
    .prepare(
      `SELECT * FROM world_facts
       WHERE campaign_id = ? AND (region_id = ? OR faction_tag = ?)
       ORDER BY created_at`
    )
    .all(campaignId, tag, tag) as WorldFactRow[]
  return rows.map(rowToWorldFact)
}
