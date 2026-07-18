import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

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
