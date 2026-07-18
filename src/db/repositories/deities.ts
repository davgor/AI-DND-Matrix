import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

export interface Deity {
  id: string
  campaignId: string
  name: string
  epithet: string
  domains: string[]
  tenets: string[]
  blurb: string
  isForgotten: boolean
  sortOrder: number
}

export interface CreateDeityInput {
  campaignId: string
  name: string
  epithet: string
  domains: string[]
  tenets: string[]
  blurb: string
  isForgotten: boolean
  sortOrder: number
}

interface DeityRow {
  id: string
  campaign_id: string
  name: string
  epithet: string
  domains: string
  tenets: string
  blurb: string
  is_forgotten: number
  sort_order: number
}

function parseStringArray(raw: string): string[] {
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    return []
  }
  return parsed.filter((item): item is string => typeof item === 'string')
}

function rowToDeity(row: DeityRow): Deity {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    name: row.name,
    epithet: row.epithet,
    domains: parseStringArray(row.domains),
    tenets: parseStringArray(row.tenets),
    blurb: row.blurb,
    isForgotten: row.is_forgotten === 1,
    sortOrder: row.sort_order
  }
}

export function createDeity(db: Database.Database, input: CreateDeityInput): Deity {
  const id = randomUUID()
  db.prepare(
    `INSERT INTO deities
       (id, campaign_id, name, epithet, domains, tenets, blurb, is_forgotten, sort_order)
     VALUES
       (@id, @campaignId, @name, @epithet, @domains, @tenets, @blurb, @isForgotten, @sortOrder)`
  ).run({
    id,
    campaignId: input.campaignId,
    name: input.name,
    epithet: input.epithet,
    domains: JSON.stringify(input.domains),
    tenets: JSON.stringify(input.tenets),
    blurb: input.blurb,
    isForgotten: input.isForgotten ? 1 : 0,
    sortOrder: input.sortOrder
  })
  const row = db.prepare('SELECT * FROM deities WHERE id = ?').get(id) as DeityRow
  return rowToDeity(row)
}

export function listDeitiesByCampaign(db: Database.Database, campaignId: string): Deity[] {
  const rows = db
    .prepare('SELECT * FROM deities WHERE campaign_id = ? ORDER BY sort_order ASC, name ASC')
    .all(campaignId) as DeityRow[]
  return rows.map(rowToDeity)
}
