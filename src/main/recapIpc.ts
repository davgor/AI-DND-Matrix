import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import { takeRecent } from '../agents/contextWindow'
import type { GenerateContext, Provider } from '../agents/providers/types'
import {
  getSessionRecap,
  upsertSessionRecap
} from '../db/repositories/campaigns'
import { listEventsByCampaign, type Event } from '../db/repositories/events'
import {
  needsSessionRecapRegeneration,
  SESSION_RECAP_EMPTY_COPY,
  type PersistedSessionRecap,
  type SessionRecapResult
} from '../shared/sessionRecap'
import { buildAgentProvider } from './campaignIpc'
import { getDb } from './db'

// 040.1: 256 — the prompt asks for a 2-4 sentence recap.
const RECAP_GENERATE_CONTEXT: GenerateContext = { maxTokens: 256, purpose: 'play.recap' }

function buildRecapPrompt(recentEvents: Event[]): string {
  return [
    `Recent events from this campaign: ${JSON.stringify(recentEvents)}`,
    'Narrate a short "previously on..." recap of what just happened, in 2-4 sentences, to remind the player where they left off.'
  ].join('\n')
}

function readLastPlayedAt(db: Database.Database, campaignId: string): string | null {
  const row = db
    .prepare('SELECT last_played_at FROM sessions WHERE campaign_id = ?')
    .get(campaignId) as { last_played_at: string } | undefined
  return row?.last_played_at ?? null
}

async function generateAndPersist(
  db: Database.Database,
  provider: Provider,
  campaignId: string
): Promise<PersistedSessionRecap> {
  const text = await generateSessionRecap(db, provider, campaignId)
  const generatedAt = new Date().toISOString()
  const recap = { text, generatedAt }
  upsertSessionRecap(db, campaignId, recap)
  return recap
}

export async function generateSessionRecap(
  db: Database.Database,
  provider: Provider,
  campaignId: string
): Promise<string> {
  const recentEvents = takeRecent(listEventsByCampaign(db, campaignId))
  if (recentEvents.length === 0) {
    return SESSION_RECAP_EMPTY_COPY
  }
  return provider.generate(buildRecapPrompt(recentEvents), {
    ...RECAP_GENERATE_CONTEXT,
    campaignId
  })
}

/** Hub boot path: return cached recap when fresh; otherwise generate, persist, return. */
export async function getOrGenerateSessionRecap(
  db: Database.Database,
  provider: Provider,
  campaignId: string
): Promise<SessionRecapResult> {
  const stored = getSessionRecap(db, campaignId)
  const lastPlayedAt = readLastPlayedAt(db, campaignId)
  if (!needsSessionRecapRegeneration({ stored, lastPlayedAt }) && stored !== null) {
    return { text: stored.text, generatedAt: stored.generatedAt, fromCache: true }
  }
  const persisted = await generateAndPersist(db, provider, campaignId)
  return { ...persisted, fromCache: false }
}

export function registerRecapHandlers(): void {
  ipcMain.handle('campaigns:generateRecap', async (_event, campaignId: string) => {
    const db = getDb()
    const persisted = await generateAndPersist(db, buildAgentProvider(), campaignId)
    return persisted.text
  })
  ipcMain.handle('campaigns:getOrGenerateSessionRecap', (_event, campaignId: string) =>
    getOrGenerateSessionRecap(getDb(), buildAgentProvider(), campaignId)
  )
}
