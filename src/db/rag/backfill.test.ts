import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestDb } from '../testUtils'
import { createCampaign } from '../repositories/campaigns'
import { createNpc } from '../repositories/npcs'
import { createRegion } from '../repositories/regions'
import {
  backfillCampaignRag,
  ensureCampaignRagBackfill,
  RAG_BACKFILL_BATCH_SIZE
} from './backfill'
import { createFakeEmbedder } from './fakeEmbedder'
import { retrieveRelevantChunks } from './retrieve'
import { EMBEDDING_DIMENSION } from './types'

function unitVector(index: number): number[] {
  const vector = Array.from({ length: EMBEDDING_DIMENSION }, () => 0)
  vector[index] = 1
  return vector
}

function seedCampaign(db: Database.Database): { campaignId: string; regionId: string; npcId: string } {
  const campaign = createCampaign(db, {
    name: 'Backfill Campaign',
    premisePrompt: 'A test premise.',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Test Region',
    description: 'A region.'
  })
  const npc = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Test NPC',
    role: 'merchant',
    disposition: 'friendly'
  })
  return { campaignId: campaign.id, regionId: region.id, npcId: npc.id }
}

interface InsertWorldFactRawInput {
  db: Database.Database
  campaignId: string
  id: string
  content: string
  regionId?: string | null
}

function insertWorldFactRaw(input: InsertWorldFactRawInput): void {
  input.db.prepare(
    `INSERT INTO world_facts (id, campaign_id, region_id, faction_tag, content, created_at)
     VALUES (?, ?, ?, NULL, ?, ?)`
  ).run(
    input.id,
    input.campaignId,
    input.regionId ?? null,
    input.content,
    '2026-01-01T00:00:00.000Z'
  )
}

function insertNpcMemoryRaw(
  db: Database.Database,
  npcId: string,
  id: string,
  content: string
): void {
  db.prepare(
    `INSERT INTO npc_memories (id, npc_id, timestamp, content, tags)
     VALUES (?, ?, ?, ?, '[]')`
  ).run(id, npcId, '2026-01-01T00:00:00.000Z', content)
}

function countRagChunks(db: Database.Database, campaignId: string): number {
  const row = db
    .prepare('SELECT COUNT(*) AS c FROM rag_chunks WHERE campaign_id = ?')
    .get(campaignId) as { c: number }
  return row.c
}

function getBackfillCompletedAt(db: Database.Database, campaignId: string): string | null {
  const row = db
    .prepare('SELECT completed_at FROM rag_backfill_state WHERE campaign_id = ?')
    .get(campaignId) as { completed_at: string | null } | undefined
  return row?.completed_at ?? null
}

describe('backfillCampaignRag idempotency', () => {
  it('indexes pending sources, marks completion, and no-ops when re-run', async () => {
    const db = createTestDb()
    const { campaignId, regionId, npcId } = seedCampaign(db)
    const factId = randomUUID()
    const memoryId = randomUUID()
    insertWorldFactRaw({
      db,
      campaignId,
      id: factId,
      content: 'The vault is hidden.',
      regionId
    })
    insertNpcMemoryRaw(db, npcId, memoryId, 'The player owes a favor.')

    const embedder = createFakeEmbedder()
    expect(countRagChunks(db, campaignId)).toBe(0)

    const first = await backfillCampaignRag({ db, campaignId, embedder })
    expect(first).toEqual({ processed: 2, completed: true })
    expect(countRagChunks(db, campaignId)).toBe(2)
    expect(getBackfillCompletedAt(db, campaignId)).not.toBeNull()

    const second = await backfillCampaignRag({ db, campaignId, embedder })
    expect(second).toEqual({ processed: 0, completed: true })
    expect(embedder.callCount).toBe(2)
  })
})

describe('ensureCampaignRagBackfill', () => {
  it('delegates to backfill when not complete and skips when complete', async () => {
    const db = createTestDb()
    const { campaignId } = seedCampaign(db)
    insertWorldFactRaw({ db, campaignId, id: randomUUID(), content: 'A lone fact.' })

    const embedder = createFakeEmbedder()
    const first = await ensureCampaignRagBackfill({ db, campaignId, embedder })
    expect(first.completed).toBe(true)
    expect(first.processed).toBe(1)

    const second = await ensureCampaignRagBackfill({ db, campaignId, embedder })
    expect(second).toEqual({ processed: 0, completed: true })
  })
})

describe('backfillCampaignRag large fixture', () => {
  it('processes hundreds of rows with bounded batch size without hanging', async () => {
    const db = createTestDb()
    const { campaignId, regionId, npcId } = seedCampaign(db)

    for (let index = 0; index < 150; index += 1) {
      insertWorldFactRaw({
        db,
        campaignId,
        id: randomUUID(),
        content: `Fact number ${index}.`,
        regionId
      })
      insertNpcMemoryRaw(db, npcId, randomUUID(), `Memory number ${index}.`)
    }

    const embedder = createFakeEmbedder()
    const result = await backfillCampaignRag({
      db,
      campaignId,
      embedder,
      batchSize: 25
    })

    expect(result).toEqual({ processed: 300, completed: true })
    expect(countRagChunks(db, campaignId)).toBe(300)
    expect(RAG_BACKFILL_BATCH_SIZE).toBeGreaterThan(0)
    expect(RAG_BACKFILL_BATCH_SIZE).toBeLessThanOrEqual(100)
  })
})

describe('backfillCampaignRag then retrieve', () => {
  it('finds expected source ids after pre-RAG seeding', async () => {
    const db = createTestDb()
    const { campaignId } = seedCampaign(db)
    const relevantFactId = randomUUID()
    const distractorFactId = randomUUID()
    const queryText = 'secret dragon hoard location'

    insertWorldFactRaw({
      db,
      campaignId,
      id: relevantFactId,
      content: 'The dragon sleeps on gold.'
    })
    insertWorldFactRaw({
      db,
      campaignId,
      id: distractorFactId,
      content: 'Weather is cloudy today.'
    })

    const embedder = createFakeEmbedder({
      fixtures: {
        [queryText]: unitVector(0),
        'The dragon sleeps on gold.': unitVector(0),
        'Weather is cloudy today.': unitVector(1)
      }
    })

    await backfillCampaignRag({ db, campaignId, embedder })

    const hits = await retrieveRelevantChunks({
      db,
      campaignId,
      query: queryText,
      scope: 'campaign',
      k: 2,
      embedder
    })

    expect(hits[0]?.sourceId).toBe(relevantFactId)
    expect(hits.map((hit) => hit.sourceId)).toContain(distractorFactId)
    expect(hits[0]?.score).toBeGreaterThan(hits[1]?.score ?? 0)
  })
})
