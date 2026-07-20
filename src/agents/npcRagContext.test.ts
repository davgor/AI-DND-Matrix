import { describe, expect, it } from 'vitest'
import { createFakeEmbedder } from '../db/rag/fakeEmbedder'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { appendNpcMemory } from '../db/repositories/npcMemories'
import { createNpc } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { createWorldFact } from '../db/repositories/worldFacts'
import { assembleNpcContext } from './npc'

async function flushRagIndexing(): Promise<void> {
  await new Promise<void>((resolve) => {
    setImmediate(resolve)
  })
}

function seedTwoNpcs(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Oakhollow',
    description: '...'
  })
  const npcA = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'A',
    role: 'villager',
    disposition: 'friendly'
  })
  const npcB = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'B',
    role: 'villager',
    disposition: 'friendly'
  })
  return { campaign, region, npcA, npcB }
}

describe('assembleNpcContext RAG isolation', () => {
  it('never leaks another NPC memory when RAG query matches both NPCs', async () => {
    const db = createTestDb()
    const { npcA, npcB } = seedTwoNpcs(db)
    const embedder = createFakeEmbedder()
    const sharedQuery = 'secret wolf pact treasure'

    appendNpcMemory(
      db,
      { npcId: npcA.id, content: 'A knows the secret wolf pact treasure is buried under the oak.', tags: [] },
      { embedder }
    )
    appendNpcMemory(
      db,
      { npcId: npcB.id, content: 'B knows the secret wolf pact treasure is hidden in the cellar.', tags: [] },
      { embedder }
    )
    await flushRagIndexing()

    const context = await assembleNpcContext(db, npcA, { embedder, query: sharedQuery })

    expect(context.memories.some((memory) => memory.content.includes('cellar'))).toBe(false)
    expect(context.memories.some((memory) => memory.content.includes('under the oak'))).toBe(true)
  })

  it('retrieves region world facts via RAG without unrelated faction facts', async () => {
    const db = createTestDb()
    const { campaign, region, npcA } = seedTwoNpcs(db)
    const embedder = createFakeEmbedder()

    createWorldFact(
      db,
      { campaignId: campaign.id, regionId: region.id, content: 'Oakhollow was burned down.' },
      { embedder }
    )
    createWorldFact(
      db,
      { campaignId: campaign.id, factionTag: 'unrelated-faction', content: 'Unrelated faction fact.' },
      { embedder }
    )
    await flushRagIndexing()

    const context = await assembleNpcContext(db, npcA, {
      embedder,
      query: 'Oakhollow burned'
    })

    expect(context.worldFacts).toContain('Oakhollow was burned down.')
    expect(context.worldFacts.some((fact) => fact.includes('Unrelated faction'))).toBe(false)
  })
})
