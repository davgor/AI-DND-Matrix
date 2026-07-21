import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { PersistedSessionRecap } from '../../shared/sessionRecap'

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
  worldName: string
  worldSummary: string
  worldHistory: string
  pantheonSummary: string
  inGameDate: number
  deathMode: DeathMode
  respawnRules: RespawnRules | null
  npcFaceTokenGenerationEnabled: boolean
}

export interface CreateCampaignInput {
  name: string
  premisePrompt: string
  deathMode: DeathMode
  respawnRules?: RespawnRules | null
  createdAt?: string
  worldName?: string
  worldSummary?: string
  worldHistory?: string
  pantheonSummary?: string
  npcFaceTokenGenerationEnabled?: boolean
}

interface CampaignRow {
  id: string
  name: string
  premise_prompt: string
  created_at: string
  current_state_summary: string
  world_name: string
  world_summary: string
  world_history: string
  pantheon_summary: string
  in_game_date: number
  death_mode: DeathMode
  respawn_rules: string | null
  npc_face_token_generation_enabled?: number | null
}

function rowToCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    name: row.name,
    premisePrompt: row.premise_prompt,
    createdAt: row.created_at,
    currentStateSummary: row.current_state_summary,
    worldName: row.world_name ?? '',
    worldSummary: row.world_summary ?? '',
    worldHistory: row.world_history ?? '',
    pantheonSummary: row.pantheon_summary ?? '',
    inGameDate: row.in_game_date,
    deathMode: row.death_mode,
    respawnRules: row.respawn_rules ? (JSON.parse(row.respawn_rules) as RespawnRules) : null,
    npcFaceTokenGenerationEnabled: row.npc_face_token_generation_enabled === 1
  }
}

function campaignHasWorldColumns(db: Database.Database): boolean {
  const columns = db.prepare('PRAGMA table_info(campaigns)').all() as Array<{ name: string }>
  return columns.some((column) => column.name === 'world_name')
}

function campaignHasPantheonSummary(db: Database.Database): boolean {
  const columns = db.prepare('PRAGMA table_info(campaigns)').all() as Array<{ name: string }>
  return columns.some((column) => column.name === 'pantheon_summary')
}

function campaignHasNpcFaceTokenColumn(db: Database.Database): boolean {
  const columns = db.prepare('PRAGMA table_info(campaigns)').all() as Array<{ name: string }>
  return columns.some((column) => column.name === 'npc_face_token_generation_enabled')
}

interface InsertCampaignRowInput {
  id: string
  name: string
  premisePrompt: string
  createdAt: string
  deathMode: DeathMode
  respawnRules: RespawnRules | null
  worldName: string
  worldSummary: string
  worldHistory: string
  pantheonSummary: string
  npcFaceTokenGenerationEnabled: boolean
}

function serializeRespawnRules(respawnRules: RespawnRules | null): string | null {
  return respawnRules ? JSON.stringify(respawnRules) : null
}

function faceTokenFlagSql(enabled: boolean): number {
  return enabled ? 1 : 0
}

function insertCampaignWithWorldAndPantheon(db: Database.Database, row: InsertCampaignRowInput): void {
  if (campaignHasNpcFaceTokenColumn(db)) {
    db.prepare(
      `INSERT INTO campaigns (
         id, name, premise_prompt, created_at, death_mode, respawn_rules,
         world_name, world_summary, world_history, pantheon_summary,
         npc_face_token_generation_enabled
       )
       VALUES (
         @id, @name, @premisePrompt, @createdAt, @deathMode, @respawnRules,
         @worldName, @worldSummary, @worldHistory, @pantheonSummary,
         @npcFaceTokenGenerationEnabled
       )`
    ).run({
      id: row.id,
      name: row.name,
      premisePrompt: row.premisePrompt,
      createdAt: row.createdAt,
      deathMode: row.deathMode,
      respawnRules: serializeRespawnRules(row.respawnRules),
      worldName: row.worldName,
      worldSummary: row.worldSummary,
      worldHistory: row.worldHistory,
      pantheonSummary: row.pantheonSummary,
      npcFaceTokenGenerationEnabled: faceTokenFlagSql(row.npcFaceTokenGenerationEnabled)
    })
    return
  }
  db.prepare(
    `INSERT INTO campaigns (
       id, name, premise_prompt, created_at, death_mode, respawn_rules,
       world_name, world_summary, world_history, pantheon_summary
     )
     VALUES (
       @id, @name, @premisePrompt, @createdAt, @deathMode, @respawnRules,
       @worldName, @worldSummary, @worldHistory, @pantheonSummary
     )`
  ).run({
    id: row.id,
    name: row.name,
    premisePrompt: row.premisePrompt,
    createdAt: row.createdAt,
    deathMode: row.deathMode,
    respawnRules: serializeRespawnRules(row.respawnRules),
    worldName: row.worldName,
    worldSummary: row.worldSummary,
    worldHistory: row.worldHistory,
    pantheonSummary: row.pantheonSummary
  })
}

function insertCampaignWithWorld(db: Database.Database, row: InsertCampaignRowInput): void {
  db.prepare(
    `INSERT INTO campaigns (
       id, name, premise_prompt, created_at, death_mode, respawn_rules,
       world_name, world_summary, world_history
     )
     VALUES (
       @id, @name, @premisePrompt, @createdAt, @deathMode, @respawnRules,
       @worldName, @worldSummary, @worldHistory
     )`
  ).run({
    id: row.id,
    name: row.name,
    premisePrompt: row.premisePrompt,
    createdAt: row.createdAt,
    deathMode: row.deathMode,
    respawnRules: serializeRespawnRules(row.respawnRules),
    worldName: row.worldName,
    worldSummary: row.worldSummary,
    worldHistory: row.worldHistory
  })
}

function insertCampaignLegacy(db: Database.Database, row: InsertCampaignRowInput): void {
  db.prepare(
    `INSERT INTO campaigns (id, name, premise_prompt, created_at, death_mode, respawn_rules)
     VALUES (@id, @name, @premisePrompt, @createdAt, @deathMode, @respawnRules)`
  ).run({
    id: row.id,
    name: row.name,
    premisePrompt: row.premisePrompt,
    createdAt: row.createdAt,
    deathMode: row.deathMode,
    respawnRules: serializeRespawnRules(row.respawnRules)
  })
}

function insertCampaignRow(db: Database.Database, row: InsertCampaignRowInput): void {
  if (campaignHasWorldColumns(db) && campaignHasPantheonSummary(db)) {
    insertCampaignWithWorldAndPantheon(db, row)
    return
  }
  if (campaignHasWorldColumns(db)) {
    insertCampaignWithWorld(db, row)
    return
  }
  insertCampaignLegacy(db, row)
}

export function createCampaign(db: Database.Database, input: CreateCampaignInput): Campaign {
  const id = randomUUID()
  const createdAt = input.createdAt ?? new Date().toISOString()
  const respawnRules = input.respawnRules ?? null
  const worldName = input.worldName ?? ''
  const worldSummary = input.worldSummary ?? ''
  const worldHistory = input.worldHistory ?? ''
  const pantheonSummary = input.pantheonSummary ?? ''
  const npcFaceTokenGenerationEnabled = input.npcFaceTokenGenerationEnabled === true

  insertCampaignRow(db, {
    id,
    name: input.name,
    premisePrompt: input.premisePrompt,
    createdAt,
    deathMode: input.deathMode,
    respawnRules,
    worldName,
    worldSummary,
    worldHistory,
    pantheonSummary,
    npcFaceTokenGenerationEnabled
  })

  return {
    id,
    name: input.name,
    premisePrompt: input.premisePrompt,
    createdAt,
    currentStateSummary: '',
    worldName,
    worldSummary,
    worldHistory,
    pantheonSummary,
    inGameDate: 0,
    deathMode: input.deathMode,
    respawnRules,
    npcFaceTokenGenerationEnabled
  }
}

export function getCampaignById(db: Database.Database, id: string): Campaign | undefined {
  const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as
    | CampaignRow
    | undefined
  return row ? rowToCampaign(row) : undefined
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

export function updateCampaignWorldSummary(
  db: Database.Database,
  id: string,
  worldSummary: string
): void {
  db.prepare('UPDATE campaigns SET world_summary = ? WHERE id = ?').run(worldSummary, id)
}

export function updateCampaignWorldHistory(
  db: Database.Database,
  id: string,
  worldHistory: string
): void {
  db.prepare('UPDATE campaigns SET world_history = ? WHERE id = ?').run(worldHistory, id)
}

export function updateCampaignPantheonSummary(
  db: Database.Database,
  id: string,
  pantheonSummary: string
): void {
  db.prepare('UPDATE campaigns SET pantheon_summary = ? WHERE id = ?').run(pantheonSummary, id)
}

export interface UpdateCampaignDeathModeInput {
  deathMode: DeathMode
  respawnRules?: RespawnRules | null
}

export function updateCampaignDeathMode(
  db: Database.Database,
  id: string,
  input: UpdateCampaignDeathModeInput
): void {
  const respawnRules = input.respawnRules ?? null
  db.prepare('UPDATE campaigns SET death_mode = ?, respawn_rules = ? WHERE id = ?').run(
    input.deathMode,
    respawnRules ? JSON.stringify(respawnRules) : null,
    id
  )
}

export function updateCampaignNpcFaceTokenGenerationEnabled(
  db: Database.Database,
  id: string,
  enabled: boolean
): void {
  db.prepare(
    'UPDATE campaigns SET npc_face_token_generation_enabled = ? WHERE id = ?'
  ).run(enabled ? 1 : 0, id)
}

export function advanceInGameDate(db: Database.Database, id: string, days: number): number {
  const row = db
    .prepare(
      'UPDATE campaigns SET in_game_date = in_game_date + ? WHERE id = ? RETURNING in_game_date'
    )
    .get(days, id) as { in_game_date: number }
  return row.in_game_date
}

interface SessionRecapRow {
  session_recap_text: string | null
  session_recap_generated_at: string | null
}

/** Campaign-scoped session recap; null when never generated (migration-safe). */
export function getSessionRecap(
  db: Database.Database,
  campaignId: string
): PersistedSessionRecap | null {
  const row = db
    .prepare(
      'SELECT session_recap_text, session_recap_generated_at FROM campaigns WHERE id = ?'
    )
    .get(campaignId) as SessionRecapRow | undefined
  if (!row?.session_recap_text || !row.session_recap_generated_at) {
    return null
  }
  return {
    text: row.session_recap_text,
    generatedAt: row.session_recap_generated_at
  }
}

export function upsertSessionRecap(
  db: Database.Database,
  campaignId: string,
  recap: PersistedSessionRecap
): void {
  db.prepare(
    `UPDATE campaigns
     SET session_recap_text = ?, session_recap_generated_at = ?
     WHERE id = ?`
  ).run(recap.text, recap.generatedAt, campaignId)
}
