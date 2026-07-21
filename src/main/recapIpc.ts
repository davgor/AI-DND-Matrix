import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import { takeRecent } from '../agents/contextWindow'
import type { GenerateContext, Provider } from '../agents/providers/types'
import { listEventsByCampaign, type Event } from '../db/repositories/events'
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

export async function generateSessionRecap(
  db: Database.Database,
  provider: Provider,
  campaignId: string
): Promise<string> {
  const recentEvents = takeRecent(listEventsByCampaign(db, campaignId))
  if (recentEvents.length === 0) {
    return 'This is the start of your story — nothing has happened yet.'
  }
  return provider.generate(buildRecapPrompt(recentEvents), {
    ...RECAP_GENERATE_CONTEXT,
    campaignId
  })
}

export function registerRecapHandlers(): void {
  ipcMain.handle('campaigns:generateRecap', (_event, campaignId: string) =>
    generateSessionRecap(getDb(), buildAgentProvider(), campaignId)
  )
}
