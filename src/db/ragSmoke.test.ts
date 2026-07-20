import { describe, expect, it } from 'vitest'
import { createTestDb } from './testUtils'
import { createCampaign } from './repositories/campaigns'
import { createCharacter } from './repositories/characters'
import { createRegion } from './repositories/regions'
import { createWorldFact } from './repositories/worldFacts'
import { assembleNarrationContext } from '../agents/dm'
import { DM_RAG_LORE_SERIALIZED_CHAR_CAP } from '../agents/dmRagContext'
import { RAG_CHUNK_INJECTION_CAP } from './rag/hybridRank'
import { createFakeEmbedder } from './rag/fakeEmbedder'
import { retrieveRelevantChunks } from './rag/retrieve'
import { EMBEDDING_DIMENSION } from './rag/types'

/**
 * Epic 083 + 040: RAG injects at most RAG_CHUNK_INJECTION_CAP lore chunks.
 * See docs/runbooks/rag-retrieval-smoke-test.md and llm-efficiency-smoke-test.md.
 */
async function flushRagIndexing(): Promise<void> {
  await new Promise<void>((resolve) => {
    setImmediate(resolve)
  })
}

function unitVector(index: number): number[] {
  const vector = Array.from({ length: EMBEDDING_DIMENSION }, () => 0)
  vector[index] = 1
  return vector
}

async function retrievesPlantedFactForParaphrase(): Promise<void> {
  const db = createTestDb()
  const plantedText = 'The village of Oakhollow was burned by raiders last winter.'
  const paraphrase = 'What happened to the burned settlement near the woods?'
  const distractor = 'A merchant sold bread in the market square today.'
  const fixtures: Record<string, number[]> = {
    [plantedText]: unitVector(0),
    [paraphrase]: unitVector(0),
    [distractor]: unitVector(1)
  }
  const embedder = createFakeEmbedder({ fixtures })
  const campaign = createCampaign(db, {
    name: 'RAG Smoke',
    premisePrompt: 'Smoke premise.',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Oakhollow',
    description: 'Ash and timber.'
  })
  const planted = createWorldFact(
    db,
    { campaignId: campaign.id, regionId: region.id, content: plantedText },
    { embedder }
  )
  createWorldFact(
    db,
    { campaignId: campaign.id, regionId: region.id, content: distractor },
    { embedder }
  )
  await flushRagIndexing()
  const hits = await retrieveRelevantChunks({
    db,
    campaignId: campaign.id,
    query: paraphrase,
    scope: 'region',
    scopeIds: { regionId: region.id },
    k: 3,
    embedder
  })
  expect(hits[0]?.sourceId).toBe(planted.id)
  expect(hits.some((hit) => hit.sourceId === planted.id)).toBe(true)
}

async function keepsAssembledLoreWithinBudget(): Promise<void> {
  const db = createTestDb()
  const embedder = createFakeEmbedder()
  const campaign = createCampaign(db, {
    name: 'RAG Budget',
    premisePrompt: 'Budget premise.',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Harbor',
    description: 'Salt air.'
  })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Ryn',
    characterClass: 'rogue',
    kind: 'player'
  })
  for (let index = 0; index < 20; index += 1) {
    createWorldFact(
      db,
      {
        campaignId: campaign.id,
        regionId: region.id,
        content: `Harbor lore fact number ${index} about docks and tides.`
      },
      { embedder }
    )
  }
  await flushRagIndexing()
  const context = await assembleNarrationContext({
    db,
    campaignId: campaign.id,
    regionId: region.id,
    characterId: player.id,
    playerInput: 'Ask about the docks and tides.',
    embedder
  })
  expect(context.worldFacts.length).toBeLessThanOrEqual(RAG_CHUNK_INJECTION_CAP)
  const loreSerialized = JSON.stringify({
    worldFacts: context.worldFacts,
    regionHistory: context.regionHistory
  })
  expect(loreSerialized.length).toBeLessThanOrEqual(DM_RAG_LORE_SERIALIZED_CHAR_CAP)
  expect(context.regionStatus).toEqual({ destroyed: false })
  expect(context.presentNpcs).toBeDefined()
}

describe('RAG smoke + relevance regression (083.11)', () => {
  it('retrieves a planted fact id for a paraphrase query in top-k', retrievesPlantedFactForParaphrase)
  it('keeps assembled RAG lore within injection cap and serialized char budget', keepsAssembledLoreWithinBudget)
})