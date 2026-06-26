import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

export interface RegionStatus {
  destroyed: boolean
  cause?: string
}

export interface Region {
  id: string
  campaignId: string
  name: string
  description: string
  status: RegionStatus
}

export interface CreateRegionInput {
  campaignId: string
  name: string
  description: string
  status?: RegionStatus
}

interface RegionRow {
  id: string
  campaign_id: string
  name: string
  description: string
  status: string
}

function rowToRegion(row: RegionRow): Region {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    name: row.name,
    description: row.description,
    status: JSON.parse(row.status) as RegionStatus
  }
}

const DEFAULT_STATUS: RegionStatus = { destroyed: false }

export function createRegion(db: Database.Database, input: CreateRegionInput): Region {
  const id = randomUUID()
  const status = input.status ?? DEFAULT_STATUS

  db.prepare(
    `INSERT INTO regions (id, campaign_id, name, description, status)
     VALUES (@id, @campaignId, @name, @description, @status)`
  ).run({
    id,
    campaignId: input.campaignId,
    name: input.name,
    description: input.description,
    status: JSON.stringify(status)
  })

  return {
    id,
    campaignId: input.campaignId,
    name: input.name,
    description: input.description,
    status
  }
}

export function getRegionById(db: Database.Database, id: string): Region | undefined {
  const row = db.prepare('SELECT * FROM regions WHERE id = ?').get(id) as RegionRow | undefined
  return row ? rowToRegion(row) : undefined
}

export function listRegionsByCampaign(db: Database.Database, campaignId: string): Region[] {
  const rows = db
    .prepare('SELECT * FROM regions WHERE campaign_id = ? ORDER BY name')
    .all(campaignId) as RegionRow[]
  return rows.map(rowToRegion)
}

export function updateRegionStatus(
  db: Database.Database,
  id: string,
  status: RegionStatus
): void {
  db.prepare('UPDATE regions SET status = ? WHERE id = ?').run(JSON.stringify(status), id)
}
