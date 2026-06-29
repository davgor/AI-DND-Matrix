import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { Alignment, Temperament } from '../../shared/alignment/types'

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
  alignment: Alignment | null
  temperament: Temperament
  canSpeak: boolean
  status: NpcStatus
  isPartyMember: boolean
}

export interface CreateNpcInput {
  campaignId: string
  regionId: string
  name: string
  role: string
  disposition: string
  alignment?: Alignment | null
  temperament?: Temperament
  canSpeak?: boolean
  status?: NpcStatus
}

interface NpcRow {
  id: string
  campaign_id: string
  region_id: string
  name: string
  role: string
  disposition: string
  alignment: string | null
  temperament: string
  can_speak: number
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
    alignment: (row.alignment as Alignment | null) ?? null,
    temperament: row.temperament as Temperament,
    canSpeak: row.can_speak === 1,
    status: JSON.parse(row.status) as NpcStatus,
    isPartyMember: row.is_party_member === 1
  }
}

const DEFAULT_STATUS: NpcStatus = { alive: true }

export function createNpc(db: Database.Database, input: CreateNpcInput): Npc {
  const id = randomUUID()
  const status = input.status ?? DEFAULT_STATUS
  const temperament = input.temperament ?? 'neutral'
  const canSpeak = input.canSpeak ?? true

  db.prepare(
    `INSERT INTO npcs (id, campaign_id, region_id, name, role, disposition, alignment, temperament, can_speak, status, is_party_member)
     VALUES (@id, @campaignId, @regionId, @name, @role, @disposition, @alignment, @temperament, @canSpeak, @status, 0)`
  ).run({
    id,
    campaignId: input.campaignId,
    regionId: input.regionId,
    name: input.name,
    role: input.role,
    disposition: input.disposition,
    alignment: input.alignment ?? null,
    temperament,
    canSpeak: canSpeak ? 1 : 0,
    status: JSON.stringify(status)
  })

  return {
    id,
    campaignId: input.campaignId,
    regionId: input.regionId,
    name: input.name,
    role: input.role,
    disposition: input.disposition,
    alignment: input.alignment ?? null,
    temperament,
    canSpeak,
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

export function updateNpcDisposition(db: Database.Database, id: string, disposition: string): void {
  db.prepare('UPDATE npcs SET disposition = ? WHERE id = ?').run(disposition, id)
}

export interface UpdateNpcTraitsInput {
  disposition?: string
  alignment?: Alignment | null
  temperament?: Temperament
  canSpeak?: boolean
}

export function updateNpcTraits(db: Database.Database, id: string, input: UpdateNpcTraitsInput): void {
  const npc = getNpcById(db, id)
  if (!npc) {
    return
  }
  db.prepare(
    `UPDATE npcs SET disposition = ?, alignment = ?, temperament = ?, can_speak = ? WHERE id = ?`
  ).run(
    input.disposition ?? npc.disposition,
    input.alignment !== undefined ? input.alignment : npc.alignment,
    input.temperament ?? npc.temperament,
    (input.canSpeak ?? npc.canSpeak) ? 1 : 0,
    id
  )
}
