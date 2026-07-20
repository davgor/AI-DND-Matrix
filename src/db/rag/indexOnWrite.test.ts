import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from '../repositories/campaigns'
import { appendNpcMemory } from '../repositories/npcMemories'
import { createNpc } from '../repositories/npcs'
import { createRegion } from '../repositories/regions'
import { createWorldFact, updateWorldFact } from '../repositories/worldFacts'
import { createFakeEmbedder } from './fakeEmbedder'
import { contentHash } from './contentHash'
import { unpackEmbedding } from './embeddingBlob'
import { EMBEDDING_DIMENSION } from './types'

interface RagChunkRow {
  campaign_id: string
  source_table: string
  source_id: string
  region_id: string | null
  npc_id: string | null
  text: string
  content_hash: string
  embedding: Buffer
}

async function flushRagIndexing(): Promise<void> {
  await new Promise<void>((resolve) => {
    setImmediate(resolve)
  })
}

function getChunkBySourceId(db: ReturnType<typeof createTestDb>, sourceId: string): RagChunkRow {
  const row = db
    .prepare('SELECT * FROM rag_chunks WHERE source_id = ?')
    .get(sourceId) as RagChunkRow | undefined
  if (!row) {
    throw new Error(`Expected rag_chunks row for source_id ${sourceId}`)
  }
  return row
}

function seedCampaign(db: ReturnType<typeof createTestDb>) {
  return createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
}

describe('index on write: insert world fact', () => {
  it('creates a rag_chunks row when a fact is inserted', async () => {
    const db = createTestDb()
    const embedder = createFakeEmbedder()
    const campaign = seedCampaign(db)
    const region = createRegion(db, {
      campaignId: campaign.id,
      name: 'Oakhollow',
      description: '...'
    })

    const fact = createWorldFact(
      db,
      {
        campaignId: campaign.id,
        regionId: region.id,
        content: 'Oakhollow was burned down.'
      },
      { embedder }
    )
    await flushRagIndexing()

    const chunk = getChunkBySourceId(db, fact.id)
    expect(chunk.campaign_id).toBe(campaign.id)
    expect(chunk.source_table).toBe('world_facts')
    expect(chunk.region_id).toBe(region.id)
    expect(chunk.npc_id).toBeNull()
    expect(chunk.text).toBe('Oakhollow was burned down.')
    expect(chunk.content_hash).toBe(contentHash('Oakhollow was burned down.'))
    expect(unpackEmbedding(chunk.embedding)).toHaveLength(EMBEDDING_DIMENSION)
    expect(embedder.callCount).toBe(1)
  })
})

describe('index on write: update world fact', () => {
  it('refreshes the embedding when fact text changes', async () => {
    const db = createTestDb()
    const embedder = createFakeEmbedder()
    const campaign = seedCampaign(db)

    const fact = createWorldFact(
      db,
      { campaignId: campaign.id, content: 'Original fact.' },
      { embedder }
    )
    await flushRagIndexing()
    const beforeHash = getChunkBySourceId(db, fact.id).content_hash

    updateWorldFact(db, fact.id, { content: 'Updated fact.' }, { embedder })
    await flushRagIndexing()

    const chunk = getChunkBySourceId(db, fact.id)
    expect(chunk.text).toBe('Updated fact.')
    expect(chunk.content_hash).not.toBe(beforeHash)
    expect(chunk.content_hash).toBe(contentHash('Updated fact.'))
    expect(embedder.callCount).toBe(2)
  })

  it('skips embedder when fact text is unchanged on update', async () => {
    const db = createTestDb()
    const embedder = createFakeEmbedder()
    const campaign = seedCampaign(db)

    const fact = createWorldFact(
      db,
      { campaignId: campaign.id, content: 'Stable fact.' },
      { embedder }
    )
    await flushRagIndexing()
    expect(embedder.callCount).toBe(1)

    updateWorldFact(db, fact.id, { content: 'Stable fact.' }, { embedder })
    await flushRagIndexing()

    expect(embedder.callCount).toBe(1)
  })
})

describe('index on write: npc_memories', () => {
  it('creates a rag_chunks row when a memory is appended', async () => {
    const db = createTestDb()
    const embedder = createFakeEmbedder()
    const campaign = seedCampaign(db)
    const region = createRegion(db, {
      campaignId: campaign.id,
      name: 'Oakhollow',
      description: '...'
    })
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Kael',
      role: 'merchant',
      disposition: 'friendly'
    })

    const memory = appendNpcMemory(
      db,
      {
        npcId: npc.id,
        content: 'The player bought a healing potion.',
        tags: ['commerce']
      },
      { embedder }
    )
    await flushRagIndexing()

    const chunk = getChunkBySourceId(db, memory.id)
    expect(chunk.campaign_id).toBe(campaign.id)
    expect(chunk.source_table).toBe('npc_memories')
    expect(chunk.npc_id).toBe(npc.id)
    expect(chunk.region_id).toBe(region.id)
    expect(chunk.text).toBe('The player bought a healing potion.')
    expect(embedder.callCount).toBe(1)
  })
})
