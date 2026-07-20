import type Database from 'better-sqlite3'
import {
  ensureCampaignRagBackfill,
  RAG_CHUNK_INJECTION_CAP,
  retrieveForContext,
  resolveEmbedder,
  type Embedder
} from '../db/rag'
import type { RetrievedChunk } from '../db/rag/retrieve'
import type { SlimEvent } from './contextSlim'

/**
 * Max combined JSON length for RAG-selected `worldFacts` + `regionHistory`
 * injected into DM narration prompts. Keeps lore grounding well below the
 * ~2600 char narration user-prompt smoke ceiling (040) while allowing up to
 * {@link RAG_CHUNK_INJECTION_CAP} chunk texts.
 */
export const DM_RAG_LORE_SERIALIZED_CHAR_CAP = 4000

export interface DmRagLoreFields {
  worldFacts: string[]
  regionHistory: string[]
  recentEvents: SlimEvent[]
}

export interface LoadDmRagLoreParams {
  db: Database.Database
  campaignId: string
  regionId: string
  playerInput: string
  recencyEvents: SlimEvent[]
  embedder?: Embedder
}

function mapHitsBySource(hits: RetrievedChunk[]): {
  worldFacts: string[]
  regionHistory: string[]
  eventTexts: string[]
} {
  const worldFacts: string[] = []
  const regionHistory: string[] = []
  const eventTexts: string[] = []
  for (const hit of hits) {
    switch (hit.sourceTable) {
      case 'world_facts':
        worldFacts.push(hit.text)
        break
      case 'region_history':
        regionHistory.push(hit.text)
        break
      case 'events':
        eventTexts.push(hit.text)
        break
      default:
        break
    }
  }
  return { worldFacts, regionHistory, eventTexts }
}

function slimEventsFromRagTexts(texts: string[]): SlimEvent[] {
  return texts.map((text) => ({ type: 'narration', narrationText: text }))
}

export async function loadDmRagLoreFields(params: LoadDmRagLoreParams): Promise<DmRagLoreFields> {
  const embedder = resolveEmbedder(params.embedder)
  await ensureCampaignRagBackfill({
    db: params.db,
    campaignId: params.campaignId,
    embedder
  })

  const hits = await retrieveForContext({
    db: params.db,
    campaignId: params.campaignId,
    query: params.playerInput,
    scope: 'region',
    scopeIds: { regionId: params.regionId },
    cap: RAG_CHUNK_INJECTION_CAP,
    embedder
  })

  const mapped = mapHitsBySource(hits)
  const recentEvents =
    mapped.eventTexts.length > 0
      ? slimEventsFromRagTexts(mapped.eventTexts)
      : params.recencyEvents

  return {
    worldFacts: mapped.worldFacts,
    regionHistory: mapped.regionHistory,
    recentEvents
  }
}
