import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

export interface NpcStatus {
  alive: boolean
  location?: string
}

export interface Npc {
  id: string
  campaignId: string
  regionId: string
  name: string
  role: string
  disposition: string
  status: NpcStatus
  isPartyMember: boolean
}

export interface CreateNpcInput {
  campaignId: string
  regionId: string
  name: string
  role: string
  disposition: string
  status?: NpcStatus
}

interface NpcRow {
  id: string
  campaign_id: string
  region_id: string
  name: string
  role: string
  disposition: string
  status: string
  is_party_member: number
}

function rowToNpc(row: NpcRow): Npc {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    regionId: row.region_id,
    name: row.name,
    role: row.role,
    disposition: row.disposition,
    status: JSON.parse(row.status) as NpcStatus,
    isPartyMember: row.is_party_member === 1
  }
}

const DEFAULT_STATUS: NpcStatus = { alive: true }

export function createNpc(db: Database.Database, input: CreateNpcInput): Npc {
  const id = randomUUID()
  const status = input.status ?? DEFAULT_STATUS

  db.prepare(
    `INSERT INTO npcs (id, campaign_id, region_id, name, role, disposition, status, is_party_member)
     VALUES (@id, @campaignId, @regionId, @name, @role, @disposition, @status, 0)`
  ).run({
    id,
    campaignId: input.campaignId,
    regionId: input.regionId,
    name: input.name,
    role: input.role,
    disposition: input.disposition,
    status: JSON.stringify(status)
  })

  return {
    id,
    campaignId: input.campaignId,
    regionId: input.regionId,
    name: input.name,
    role: input.role,
    disposition: input.disposition,
    status,
    isPartyMember: false
  }
}

export function getNpcById(db: Database.Database, id: string): Npc | undefined {
  const row = db.prepare('SELECT * FROM npcs WHERE id = ?').get(id) as NpcRow | undefined
  return row ? rowToNpc(row) : undefined
}

export function listNpcsByRegion(db: Database.Database, regionId: string): Npc[] {
  const rows = db
    .prepare('SELECT * FROM npcs WHERE region_id = ? ORDER BY name')
    .all(regionId) as NpcRow[]
  return rows.map(rowToNpc)
}

export function updateNpcStatus(db: Database.Database, id: string, status: NpcStatus): void {
  db.prepare('UPDATE npcs SET status = ? WHERE id = ?').run(JSON.stringify(status), id)
}

export function markNpcPromoted(db: Database.Database, id: string): void {
  db.prepare('UPDATE npcs SET is_party_member = 1 WHERE id = ?').run(id)
}
