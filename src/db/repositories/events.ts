import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

export interface Event {
  id: string
  campaignId: string
  timestamp: string
  type: string
  payload: Record<string, unknown>
}

export interface AppendEventInput {
  campaignId: string
  type: string
  payload: Record<string, unknown>
  timestamp?: string
}

export interface ListEventsOptions {
  type?: string
  limit?: number
}

interface EventRow {
  id: string
  campaign_id: string
  timestamp: string
  type: string
  payload: string
}

function rowToEvent(row: EventRow): Event {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    timestamp: row.timestamp,
    type: row.type,
    payload: JSON.parse(row.payload) as Record<string, unknown>
  }
}

export function appendEvent(db: Database.Database, input: AppendEventInput): Event {
  const id = randomUUID()
  const timestamp = input.timestamp ?? new Date().toISOString()

  db.prepare(
    'INSERT INTO events (id, campaign_id, timestamp, type, payload) VALUES (?, ?, ?, ?, ?)'
  ).run(id, input.campaignId, timestamp, input.type, JSON.stringify(input.payload))

  return { id, campaignId: input.campaignId, timestamp, type: input.type, payload: input.payload }
}

export function listEventsByCampaign(
  db: Database.Database,
  campaignId: string,
  options: ListEventsOptions = {}
): Event[] {
  const { type, limit } = options

  if (limit === undefined) {
    const rows = type
      ? (db
          .prepare('SELECT * FROM events WHERE campaign_id = ? AND type = ? ORDER BY rowid')
          .all(campaignId, type) as EventRow[])
      : (db
          .prepare('SELECT * FROM events WHERE campaign_id = ? ORDER BY rowid')
          .all(campaignId) as EventRow[])
    return rows.map(rowToEvent)
  }

  const rows = type
    ? (db
        .prepare(
          'SELECT * FROM events WHERE campaign_id = ? AND type = ? ORDER BY rowid DESC LIMIT ?'
        )
        .all(campaignId, type, limit) as EventRow[])
    : (db
        .prepare('SELECT * FROM events WHERE campaign_id = ? ORDER BY rowid DESC LIMIT ?')
        .all(campaignId, limit) as EventRow[])
  return rows.reverse().map(rowToEvent)
}
