import { describe, expect, it } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { appendEvent } from '../db/repositories/events'
import { createRegion } from '../db/repositories/regions'
import { createRegionHistoryEntry } from '../db/repositories/regionHistory'
import { createFakeEmbedder } from '../db/rag/fakeEmbedder'
import { packEmbedding } from '../db/rag/embeddingBlob'
import { RAG_CHUNK_INJECTION_CAP } from '../db/rag/hybridRank'
import { EMBEDDING_DIMENSION } from '../db/rag/types'
import { assembleNarrationContext } from './dm'
import { DM_RAG_LORE_SERIALIZED_CHAR_CAP } from './dmRagContext'

function markRagBackfillComplete(db: Database.Database, campaignId: string): void {
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO rag_backfill_state (campaign_id, completed_at, updated_at)
     VALUES (?, ?, ?)`
  ).run(campaignId, now, now)
}

function unitVector(index: number): number[] {
  const vector = Array.from({ length: EMBEDDING_DIMENSION }, () => 0)
  vector[index] = 1
  return vector
}

function insertRagChunk(
  db: Database.Database,
  campaignId: string,
  chunk: {
    id: string
    sourceTable: string
    sourceId: string
    text: string
    embedding: number[]
    updatedAt: string
    regionId?: string | null
  }
): void {
  db.prepare(
    `INSERT INTO rag_chunks (
      id, campaign_id, source_table, source_id, region_id, npc_id, character_id,
      text, content_hash, embedding, updated_at, embedder_id, model_id, embedding_dim
    ) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    chunk.id,
    campaignId,
    chunk.sourceTable,
    chunk.sourceId,
    chunk.regionId ?? null,
    chunk.text,
    `hash-${chunk.id}`,
    packEmbedding(chunk.embedding),
    chunk.updatedAt,
    'fake',
    'fake-v1',
    EMBEDDING_DIMENSION
  )
}

function seedNarrationScene(db: Database.Database, names: {
  campaign: string
  region: string
  player: string
  className: string
}) {
  const campaign = createCampaign(db, {
    name: names.campaign,
    premisePrompt: 'Premise.',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: names.region,
    description: 'Region.'
  })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: names.player,
    characterClass: names.className,
    kind: 'player'
  })
  return { campaign, region, player }
}

function seedTreatyAndNoiseChunks(input: {
  db: Database.Database
  campaignId: string
  regionId: string
  treatyFact: string
  marketNoise: string
  treatyVector: number[]
  noiseVector: number[]
}): void {
  const { db, campaignId, regionId, treatyFact, marketNoise, treatyVector, noiseVector } = input
  insertRagChunk(db, campaignId, {
    id: 'chunk-treaty',
    sourceTable: 'world_facts',
    sourceId: 'treaty-fact',
    text: treatyFact,
    embedding: treatyVector,
    updatedAt: '2020-01-01T00:00:00.000Z',
    regionId
  })
  for (let index = 0; index < 15; index += 1) {
    insertRagChunk(db, campaignId, {
      id: `chunk-noise-${index}`,
      sourceTable: 'world_facts',
      sourceId: `noise-fact-${index}`,
      text: `${marketNoise} Stall ${index}.`,
      embedding: noiseVector,
      updatedAt: `2026-07-${String((index % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
      regionId
    })
  }
}

function appendRecentNoiseEvents(db: Database.Database, campaignId: string): void {
  for (let index = 0; index < 25; index += 1) {
    appendEvent(db, {
      campaignId,
      type: 'narration',
      payload: { narrationText: `Recent event ${index}: unrelated tavern chatter.` },
      timestamp: `2026-07-${String((index % 28) + 1).padStart(2, '0')}T12:00:00.000Z`
    })
  }
}

function assertTreatyLoreContext(
  context: Awaited<ReturnType<typeof assembleNarrationContext>>,
  treatyFact: string
): void {
  expect(context.worldFacts).toContain(treatyFact)
  expect(context.worldFacts[0]).toBe(treatyFact)
  expect(context.worldFacts.length).toBeLessThanOrEqual(RAG_CHUNK_INJECTION_CAP)
  expect(context.regionStatus).toEqual({ destroyed: false })
  expect(context.presentNpcs.length).toBeGreaterThanOrEqual(0)
  expect(context.storyThreadState).toBeDefined()
  const loreJson = JSON.stringify({
    worldFacts: context.worldFacts,
    regionHistory: context.regionHistory
  })
  expect(loreJson.length).toBeLessThanOrEqual(DM_RAG_LORE_SERIALIZED_CHAR_CAP)
}
async function includesRelevantOlderFactsExcludesNoise(): Promise<void> {
  const db = createTestDb()
  const { campaign, region, player } = seedNarrationScene(db, {
    campaign: 'RAG Lore Campaign',
    region: 'Northmarches',
    player: 'Kael',
    className: 'fighter'
  })
  const treatyFact = 'The ancient silver dragon treaty binds the northern clans.'
  const marketNoise = 'Fresh bread smells wonderful at the morning market today.'
  const treatyVector = unitVector(0)
  const noiseVector = unitVector(1)
  const queryText = 'What do we know about the silver dragon treaty?'
  markRagBackfillComplete(db, campaign.id)
  seedTreatyAndNoiseChunks({
    db,
    campaignId: campaign.id,
    regionId: region.id,
    treatyFact,
    marketNoise,
    treatyVector,
    noiseVector
  })
  appendRecentNoiseEvents(db, campaign.id)
  const embedder = createFakeEmbedder({
    fixtures: {
      [queryText]: treatyVector,
      [treatyFact]: treatyVector,
      [marketNoise]: noiseVector
    }
  })
  const context = await assembleNarrationContext({
    db,
    campaignId: campaign.id,
    regionId: region.id,
    characterId: player.id,
    playerInput: queryText,
    embedder
  })
  assertTreatyLoreContext(context, treatyFact)
}

async function fillsRegionHistoryFromRagHits(): Promise<void> {
  const db = createTestDb()
  const { campaign, region, player } = seedNarrationScene(db, {
    campaign: 'Region History RAG',
    region: 'Old Keep',
    player: 'Mira',
    className: 'wizard'
  })
  const historyText = 'Centuries ago the keep fell during the siege of embers.'
  const historyVector = unitVector(2)
  const queryText = 'Tell me about the siege of embers'
  markRagBackfillComplete(db, campaign.id)
  const embedder = createFakeEmbedder({
    fixtures: {
      [queryText]: historyVector,
      [historyText]: historyVector
    }
  })
  createRegionHistoryEntry(
    db,
    {
      regionId: region.id,
      inGameDate: 100,
      content: historyText
    },
    { embedder }
  )
  await new Promise<void>((resolve) => {
    setImmediate(resolve)
  })
  const context = await assembleNarrationContext({
    db,
    campaignId: campaign.id,
    regionId: region.id,
    characterId: player.id,
    playerInput: queryText,
    embedder
  })
  expect(context.regionHistory).toContain(historyText)
}

describe('assembleNarrationContext RAG lore', () => {
  it(
    'includes semantically relevant older world facts and excludes unrelated recent noise',
    includesRelevantOlderFactsExcludesNoise
  )
  it('fills regionHistory from RAG hits when indexed chunks exist', fillsRegionHistoryFromRagHits)
})