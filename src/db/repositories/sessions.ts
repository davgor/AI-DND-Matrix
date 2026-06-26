import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

export interface Session {
  id: string
  campaignId: string
  startedAt: string
  lastPlayedAt: string
}

interface SessionRow {
  id: string
  campaign_id: string
  started_at: string
  last_played_at: string
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    startedAt: row.started_at,
    lastPlayedAt: row.last_played_at
  }
}

export function startSession(
  db: Database.Database,
  campaignId: string,
  startedAt: string = new Date().toISOString()
): Session {
  const id = randomUUID()

  db.prepare(
    `INSERT INTO sessions (id, campaign_id, started_at, last_played_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(campaign_id) DO UPDATE SET started_at = excluded.started_at, last_played_at = excluded.last_played_at`
  ).run(id, campaignId, startedAt, startedAt)

  return { id, campaignId, startedAt, lastPlayedAt: startedAt }
}

export function touchLastPlayed(
  db: Database.Database,
  campaignId: string,
  lastPlayedAt: string = new Date().toISOString()
): void {
  const id = randomUUID()

  db.prepare(
    `INSERT INTO sessions (id, campaign_id, started_at, last_played_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(campaign_id) DO UPDATE SET last_played_at = excluded.last_played_at`
  ).run(id, campaignId, lastPlayedAt, lastPlayedAt)
}

export function listSessionsByLastPlayed(db: Database.Database): Session[] {
  const rows = db
    .prepare('SELECT * FROM sessions ORDER BY last_played_at DESC')
    .all() as SessionRow[]
  return rows.map(rowToSession)
}
