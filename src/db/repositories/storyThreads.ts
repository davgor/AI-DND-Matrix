import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

export interface StoryThread {
  id: string
  campaignId: string
  title: string
  state: string
  summary: string
}

export interface CreateStoryThreadInput {
  campaignId: string
  title: string
  state: string
  summary?: string
}

interface StoryThreadRow {
  id: string
  campaign_id: string
  title: string
  state: string
  summary: string
}

function rowToStoryThread(row: StoryThreadRow): StoryThread {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    title: row.title,
    state: row.state,
    summary: row.summary
  }
}

export function createStoryThread(
  db: Database.Database,
  input: CreateStoryThreadInput
): StoryThread {
  const id = randomUUID()
  const summary = input.summary ?? ''

  db.prepare(
    'INSERT INTO story_threads (id, campaign_id, title, state, summary) VALUES (?, ?, ?, ?, ?)'
  ).run(id, input.campaignId, input.title, input.state, summary)

  return { id, campaignId: input.campaignId, title: input.title, state: input.state, summary }
}

export function listStoryThreadsByCampaign(
  db: Database.Database,
  campaignId: string
): StoryThread[] {
  const rows = db
    .prepare('SELECT * FROM story_threads WHERE campaign_id = ? ORDER BY title')
    .all(campaignId) as StoryThreadRow[]
  return rows.map(rowToStoryThread)
}

export function updateStoryThreadStateAndSummary(
  db: Database.Database,
  id: string,
  state: string,
  summary: string
): void {
  db.prepare('UPDATE story_threads SET state = ?, summary = ? WHERE id = ?').run(
    state,
    summary,
    id
  )
}
