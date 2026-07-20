import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import { resolveEmbedder, upsertRagChunk } from '../rag/upsertChunk'
import type { Embedder } from '../rag/types'

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

export interface UpdateWorldFactInput {
  content: string
}

export interface WriteWorldFactOptions {
  embedder?: Embedder
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

function indexWorldFact(
  db: Database.Database,
  fact: WorldFact,
  options?: WriteWorldFactOptions
): void {
  void upsertRagChunk({
    db,
    campaignId: fact.campaignId,
    sourceTable: 'world_facts',
    sourceId: fact.id,
    regionId: fact.regionId,
    text: fact.content,
    embedder: resolveEmbedder(options?.embedder)
  }).catch(() => undefined)
}

export function createWorldFact(
  db: Database.Database,
  input: CreateWorldFactInput,
  options?: WriteWorldFactOptions
): WorldFact {
  const id = randomUUID()
  const regionId = input.regionId ?? null
  const factionTag = input.factionTag ?? null
  const createdAt = input.createdAt ?? new Date().toISOString()

  db.prepare(
    `INSERT INTO world_facts (id, campaign_id, region_id, faction_tag, content, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, input.campaignId, regionId, factionTag, input.content, createdAt)

  const fact: WorldFact = {
    id,
    campaignId: input.campaignId,
    regionId,
    factionTag,
    content: input.content,
    createdAt
  }
  indexWorldFact(db, fact, options)
  return fact
}

export function getWorldFactById(db: Database.Database, factId: string): WorldFact | null {
  const row = db.prepare('SELECT * FROM world_facts WHERE id = ?').get(factId) as WorldFactRow | undefined
  return row ? rowToWorldFact(row) : null
}

export function updateWorldFact(
  db: Database.Database,
  factId: string,
  input: UpdateWorldFactInput,
  options?: WriteWorldFactOptions
): WorldFact | null {
  const row = db.prepare('SELECT * FROM world_facts WHERE id = ?').get(factId) as WorldFactRow | undefined
  if (!row) {
    return null
  }

  db.prepare('UPDATE world_facts SET content = ? WHERE id = ?').run(input.content, factId)

  const fact = rowToWorldFact({ ...row, content: input.content })
  indexWorldFact(db, fact, options)
  return fact
}

export function listQuestHooksByRegion(db: Database.Database, regionId: string): WorldFact[] {
  const rows = db
    .prepare(
      `SELECT * FROM world_facts
       WHERE region_id = ? AND faction_tag = 'quest_hook'
       ORDER BY created_at`
    )
    .all(regionId) as WorldFactRow[]
  return rows.map(rowToWorldFact)
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
