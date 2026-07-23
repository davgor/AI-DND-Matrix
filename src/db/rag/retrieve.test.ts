import { describe, expect, it } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestDb } from '../testUtils'
import { createCampaign } from '../repositories/campaigns'
import { createFakeEmbedder } from './fakeEmbedder'
import { packEmbedding } from './embeddingBlob'
import { EMBEDDING_DIMENSION } from './types'
import { retrieveRelevantChunks } from './retrieve'

function unitVector(index: number): number[] {
  const vector = Array.from({ length: EMBEDDING_DIMENSION }, () => 0)
  vector[index] = 1
  return vector
}

interface InsertChunkParams {
  id: string
  sourceTable: string
  sourceId: string
  text: string
  embedding: number[]
  regionId?: string | null
  npcId?: string | null
  characterId?: string | null
  embedderId?: string
  modelId?: string
  embeddingDim?: number
}

function insertRagChunk(
  db: Database.Database,
  campaignId: string,
  chunk: InsertChunkParams
): void {
  db.prepare(
    `INSERT INTO rag_chunks (
      id, campaign_id, source_table, source_id, region_id, npc_id, character_id,
      text, content_hash, embedding, updated_at, embedder_id, model_id, embedding_dim
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    chunk.id,
    campaignId,
    chunk.sourceTable,
    chunk.sourceId,
    chunk.regionId ?? null,
    chunk.npcId ?? null,
    chunk.characterId ?? null,
    chunk.text,
    `hash-${chunk.id}`,
    packEmbedding(chunk.embedding),
    '2026-01-01T00:00:00.000Z',
    chunk.embedderId ?? 'fake',
    chunk.modelId ?? 'fake-v1',
    chunk.embeddingDim ?? EMBEDDING_DIMENSION
  )
}

function createTestCampaign(db: Database.Database, name: string): string {
  return createCampaign(db, {
    name,
    premisePrompt: `${name} premise.`,
    deathMode: 'legendary',
    respawnRules: null
  }).id
}

function seedRankingCorpus(db: Database.Database, campaignId: string): void {
  insertRagChunk(db, campaignId, {
    id: 'chunk-distractor-a',
    sourceTable: 'world_facts',
    sourceId: 'fact-a',
    text: 'Weather is cloudy today.',
    embedding: unitVector(1)
  })
  insertRagChunk(db, campaignId, {
    id: 'chunk-relevant',
    sourceTable: 'world_facts',
    sourceId: 'fact-relevant',
    text: 'The dragon sleeps on gold.',
    embedding: unitVector(0)
  })
  insertRagChunk(db, campaignId, {
    id: 'chunk-distractor-b',
    sourceTable: 'world_facts',
    sourceId: 'fact-b',
    text: 'The tavern serves ale.',
    embedding: unitVector(2)
  })
}

function seedNpcIsolationCorpus(db: Database.Database, campaignId: string): void {
  const sharedWording = 'The player promised to retrieve the lost amulet from the ruins.'
  const memoryVector = unitVector(10)
  insertRagChunk(db, campaignId, {
    id: 'chunk-npc-a',
    sourceTable: 'npc_memories',
    sourceId: 'mem-a',
    text: sharedWording,
    embedding: memoryVector,
    npcId: 'npc-a'
  })
  insertRagChunk(db, campaignId, {
    id: 'chunk-npc-b',
    sourceTable: 'npc_memories',
    sourceId: 'mem-b',
    text: sharedWording,
    embedding: memoryVector,
    npcId: 'npc-b'
  })
}

describe('retrieveRelevantChunks empty corpus', () => {
  it('returns [] without throwing', async () => {
    const db = createTestDb()
    const campaignId = createTestCampaign(db, 'Empty')
    const embedder = createFakeEmbedder()

    const hits = await retrieveRelevantChunks({
      db,
      campaignId,
      query: 'Where is the dragon?',
      scope: 'campaign',
      k: 5,
      embedder
    })

    expect(hits).toEqual([])
  })
})

describe('retrieveRelevantChunks ranking', () => {
  it('prefers the planted relevant chunk over distractors', async () => {
    const db = createTestDb()
    const campaignId = createTestCampaign(db, 'Rank test')
    seedRankingCorpus(db, campaignId)

    const queryText = 'secret dragon hoard location'
    const embedder = createFakeEmbedder({
      fixtures: {
        [queryText]: unitVector(0),
        'The dragon sleeps on gold.': unitVector(0),
        'Weather is cloudy today.': unitVector(1),
        'The tavern serves ale.': unitVector(2)
      }
    })

    const hits = await retrieveRelevantChunks({
      db,
      campaignId,
      query: queryText,
      scope: 'campaign',
      k: 3,
      embedder
    })

    expect(hits).toHaveLength(3)
    expect(hits[0]).toMatchObject({
      sourceTable: 'world_facts',
      sourceId: 'fact-relevant',
      text: 'The dragon sleeps on gold.'
    })
    expect(hits[0]?.score).toBe(1)
    expect(hits.slice(1).every((hit) => hit.score < hits[0]!.score)).toBe(true)
  })
})

describe('retrieveRelevantChunks hit shape', () => {
  it('returns sourceTable, sourceId, text, and score', async () => {
    const db = createTestDb()
    const campaignId = createTestCampaign(db, 'Shape test')
    const vector = unitVector(5)
    const embedder = createFakeEmbedder({
      fixtures: {
        'find the vault': vector,
        'Vault behind the waterfall.': vector
      }
    })

    insertRagChunk(db, campaignId, {
      id: 'chunk-one',
      sourceTable: 'region_history',
      sourceId: 'hist-1',
      text: 'Vault behind the waterfall.',
      embedding: vector
    })

    const hits = await retrieveRelevantChunks({
      db,
      campaignId,
      query: 'find the vault',
      scope: 'campaign',
      k: 1,
      embedder
    })

    expect(hits).toEqual([
      {
        sourceTable: 'region_history',
        sourceId: 'hist-1',
        text: 'Vault behind the waterfall.',
        score: expect.any(Number)
      }
    ])
  })
})

describe('retrieveRelevantChunks npc isolation', () => {
  it('never returns another NPC memory', async () => {
    const db = createTestDb()
    const campaignId = createTestCampaign(db, 'Isolation')
    seedNpcIsolationCorpus(db, campaignId)

    const queryText = 'lost amulet promise ruins'
    const embedder = createFakeEmbedder({
      fixtures: {
        [queryText]: unitVector(10),
        'The player promised to retrieve the lost amulet from the ruins.': unitVector(10)
      }
    })

    const hits = await retrieveRelevantChunks({
      db,
      campaignId,
      query: queryText,
      scope: 'npc',
      scopeIds: { npcId: 'npc-a', regionId: 'region-1' },
      k: 5,
      embedder
    })

    const npcMemoryHits = hits.filter((hit) => hit.sourceTable === 'npc_memories')
    expect(npcMemoryHits).toHaveLength(1)
    expect(npcMemoryHits[0]?.sourceId).toBe('mem-a')
    expect(npcMemoryHits.some((hit) => hit.sourceId === 'mem-b')).toBe(false)
  })
})

describe('retrieveRelevantChunks npc world facts', () => {
  it('includes matching world_facts when regionId is set', async () => {
    const db = createTestDb()
    const campaignId = createTestCampaign(db, 'NPC world facts')
    const queryText = 'ancient treaty'
    const vector = unitVector(20)
    const embedder = createFakeEmbedder({
      fixtures: {
        [queryText]: vector,
        'An ancient treaty binds the clans.': vector
      }
    })

    insertRagChunk(db, campaignId, {
      id: 'chunk-fact',
      sourceTable: 'world_facts',
      sourceId: 'fact-1',
      text: 'An ancient treaty binds the clans.',
      embedding: vector,
      regionId: 'region-east'
    })

    const hits = await retrieveRelevantChunks({
      db,
      campaignId,
      query: queryText,
      scope: 'npc',
      scopeIds: { npcId: 'npc-x', regionId: 'region-east' },
      k: 5,
      embedder
    })

    expect(hits).toHaveLength(1)
    expect(hits[0]?.sourceTable).toBe('world_facts')
  })
})

describe('retrieveRelevantChunks embedder space filter', () => {
  it('does not score chunks from a different embedder_id', async () => {
    const db = createTestDb()
    const campaignId = createTestCampaign(db, 'Space filter')
    const vector = unitVector(0)
    insertRagChunk(db, campaignId, {
      id: 'chunk-other',
      sourceTable: 'world_facts',
      sourceId: 'fact-other',
      text: 'Foreign space fact.',
      embedding: vector,
      embedderId: 'lexical',
      modelId: 'hashed-bow-v1',
      embeddingDim: EMBEDDING_DIMENSION
    })

    const embedder = createFakeEmbedder({
      fixtures: { q: vector, 'Foreign space fact.': vector }
    })
    const hits = await retrieveRelevantChunks({
      db,
      campaignId,
      query: 'q',
      scope: 'campaign',
      k: 5,
      embedder
    })
    expect(hits).toEqual([])
  })
})
