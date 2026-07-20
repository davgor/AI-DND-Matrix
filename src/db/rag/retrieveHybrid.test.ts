import { describe, expect, it } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestDb } from '../testUtils'
import { createCampaign } from '../repositories/campaigns'
import { createFakeEmbedder } from './fakeEmbedder'
import { packEmbedding } from './embeddingBlob'
import { RAG_CHUNK_INJECTION_CAP } from './hybridRank'
import { retrieveForContext, retrieveWithHybridRank } from './retrieveHybrid'
import { EMBEDDING_DIMENSION, type Embedder } from './types'

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
  updatedAt: string
  regionId?: string | null
  npcId?: string | null
  characterId?: string | null
}

function insertRagChunk(
  db: Database.Database,
  campaignId: string,
  chunk: InsertChunkParams
): void {
  db.prepare(
    `INSERT INTO rag_chunks (
      id, campaign_id, source_table, source_id, region_id, npc_id, character_id,
      text, content_hash, embedding, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
    chunk.updatedAt
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

function createThrowingEmbedder(): Embedder {
  return {
    name: 'fake',
    dimension: EMBEDDING_DIMENSION,
    async embed(): Promise<number[][]> {
      throw new Error('embedder unavailable')
    }
  }
}

describe('retrieveWithHybridRank cap', () => {
  it('returns at most RAG_CHUNK_INJECTION_CAP chunks from an oversized corpus', async () => {
    const db = createTestDb()
    const campaignId = createTestCampaign(db, 'Cap test')
    const vector = unitVector(0)
    const queryText = 'dragon hoard'

    for (let index = 0; index < 25; index += 1) {
      insertRagChunk(db, campaignId, {
        id: `chunk-${index}`,
        sourceTable: 'world_facts',
        sourceId: `fact-${index}`,
        text: `Fact number ${index} about dragons.`,
        embedding: vector,
        updatedAt: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`
      })
    }

    const embedder = createFakeEmbedder({
      fixtures: {
        [queryText]: vector,
        ...Object.fromEntries(
          Array.from({ length: 25 }, (_, index) => [
            `Fact number ${index} about dragons.`,
            vector
          ])
        )
      }
    })

    const hits = await retrieveWithHybridRank({
      db,
      campaignId,
      query: queryText,
      scope: 'campaign',
      embedder
    })

    expect(hits.length).toBeLessThanOrEqual(RAG_CHUNK_INJECTION_CAP)
    expect(hits).toHaveLength(RAG_CHUNK_INJECTION_CAP)
  })
})

describe('retrieveWithHybridRank tag boost', () => {
  it('promotes a tag-matched chunk above a higher semantic distractor', async () => {
    const db = createTestDb()
    const campaignId = createTestCampaign(db, 'Tag boost')
    const queryText = 'ancient treaty'
    const queryVector = unitVector(0)
    const distractorVector = unitVector(1)

    insertRagChunk(db, campaignId, {
      id: 'chunk-distractor',
      sourceTable: 'world_facts',
      sourceId: 'fact-distractor',
      text: 'Unrelated weather report.',
      embedding: distractorVector,
      updatedAt: '2026-01-01T00:00:00.000Z'
    })
    insertRagChunk(db, campaignId, {
      id: 'chunk-tagged',
      sourceTable: 'world_facts',
      sourceId: 'fact-tagged',
      text: 'Treaty summary with weaker embedding match.',
      embedding: unitVector(2),
      updatedAt: '2026-01-02T00:00:00.000Z'
    })

    const embedder = createFakeEmbedder({
      fixtures: {
        [queryText]: queryVector,
        'Unrelated weather report.': distractorVector,
        'Treaty summary with weaker embedding match.': unitVector(2)
      }
    })

    const hits = await retrieveWithHybridRank({
      db,
      campaignId,
      query: queryText,
      scope: 'campaign',
      embedder,
      tagMatchedSourceIds: new Set(['fact-tagged']),
      cap: 2
    })

    expect(hits).toHaveLength(2)
    expect(hits[0]?.sourceId).toBe('fact-tagged')
  })
})

describe('retrieveForContext embedder fallback', () => {
  it('returns bounded recency-ordered chunks when embedder throws', async () => {
    const db = createTestDb()
    const campaignId = createTestCampaign(db, 'Fallback')
    const vector = unitVector(4)

    for (let index = 0; index < 20; index += 1) {
      insertRagChunk(db, campaignId, {
        id: `chunk-${index}`,
        sourceTable: 'world_facts',
        sourceId: `fact-${index}`,
        text: `Fallback fact ${index}.`,
        embedding: vector,
        updatedAt: `2026-02-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`
      })
    }

    const hits = await retrieveForContext({
      db,
      campaignId,
      query: 'anything',
      scope: 'campaign',
      embedder: createThrowingEmbedder()
    })

    expect(hits.length).toBeLessThanOrEqual(RAG_CHUNK_INJECTION_CAP)
    expect(hits).toHaveLength(RAG_CHUNK_INJECTION_CAP)
    expect(hits[0]?.sourceId).toBe('fact-19')
    expect(hits.at(-1)?.sourceId).toBe(`fact-${20 - RAG_CHUNK_INJECTION_CAP}`)
    expect(hits.every((hit) => hit.score === 0)).toBe(true)
  })
})
