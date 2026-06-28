import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

export type DeathMode = 'legendary' | 'standard' | 'respawn'

export interface RespawnRules {
  location: string
  cost: number
  limit: number | null
}

export interface Campaign {
  id: string
  name: string
  premisePrompt: string
  createdAt: string
  currentStateSummary: string
  inGameDate: number
  deathMode: DeathMode
  respawnRules: RespawnRules | null
}

export interface CreateCampaignInput {
  name: string
  premisePrompt: string
  deathMode: DeathMode
  respawnRules?: RespawnRules | null
  createdAt?: string
}

interface CampaignRow {
  id: string
  name: string
  premise_prompt: string
  created_at: string
  current_state_summary: string
  in_game_date: number
  death_mode: DeathMode
  respawn_rules: string | null
}

function rowToCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    name: row.name,
    premisePrompt: row.premise_prompt,
    createdAt: row.created_at,
    currentStateSummary: row.current_state_summary,
    inGameDate: row.in_game_date,
    deathMode: row.death_mode,
    respawnRules: row.respawn_rules ? (JSON.parse(row.respawn_rules) as RespawnRules) : null
  }
}

export function createCampaign(db: Database.Database, input: CreateCampaignInput): Campaign {
  const id = randomUUID()
  const createdAt = input.createdAt ?? new Date().toISOString()
  const respawnRules = input.respawnRules ?? null

  db.prepare(
    `INSERT INTO campaigns (id, name, premise_prompt, created_at, death_mode, respawn_rules)
     VALUES (@id, @name, @premisePrompt, @createdAt, @deathMode, @respawnRules)`
  ).run({
    id,
    name: input.name,
    premisePrompt: input.premisePrompt,
    createdAt,
    deathMode: input.deathMode,
    respawnRules: respawnRules ? JSON.stringify(respawnRules) : null
  })

  return {
    id,
    name: input.name,
    premisePrompt: input.premisePrompt,
    createdAt,
    currentStateSummary: '',
    inGameDate: 0,
    deathMode: input.deathMode,
    respawnRules
  }
}

export function getCampaignById(db: Database.Database, id: string): Campaign | undefined {
  const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as
    | CampaignRow
    | undefined
  return row ? rowToCampaign(row) : undefined
}

export function listCampaigns(db: Database.Database): Campaign[] {
  const rows = db
    .prepare('SELECT * FROM campaigns ORDER BY created_at DESC')
    .all() as CampaignRow[]
  return rows.map(rowToCampaign)
}

export interface CampaignWithLastPlayed extends Campaign {
  lastPlayedAt: string | null
}

interface CampaignWithLastPlayedRow extends CampaignRow {
  session_last_played_at: string | null
}

export function listCampaignsByLastPlayed(db: Database.Database): CampaignWithLastPlayed[] {
  const rows = db
    .prepare(
      `SELECT c.*, s.last_played_at AS session_last_played_at
       FROM campaigns c
       LEFT JOIN sessions s ON s.campaign_id = c.id
       ORDER BY COALESCE(s.last_played_at, c.created_at) DESC`
    )
    .all() as CampaignWithLastPlayedRow[]

  return rows.map((row) => ({
    ...rowToCampaign(row),
    lastPlayedAt: row.session_last_played_at
  }))
}

export function updateCampaignStateSummary(
  db: Database.Database,
  id: string,
  summary: string
): void {
  db.prepare('UPDATE campaigns SET current_state_summary = ? WHERE id = ?').run(summary, id)
}

export function advanceInGameDate(db: Database.Database, id: string, days: number): number {
  const row = db
    .prepare(
      'UPDATE campaigns SET in_game_date = in_game_date + ? WHERE id = ? RETURNING in_game_date'
    )
    .get(days, id) as { in_game_date: number }
  return row.in_game_date
}
