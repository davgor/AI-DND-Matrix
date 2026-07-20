import { describe, expect, it } from 'vitest'
import { createFakeEmbedder } from '../db/rag/fakeEmbedder'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { appendNpcMemory } from '../db/repositories/npcMemories'
import { createNpc } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { assemblePartyMemberContext } from './partyMember'

async function flushRagIndexing(): Promise<void> {
  await new Promise<void>((resolve) => {
    setImmediate(resolve)
  })
}

function seedCampaign(db: ReturnType<typeof createTestDb>) {
  return createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
}

async function carriesSourceNpcMemoriesWithoutLeak(): Promise<void> {
  const db = createTestDb()
  const campaign = seedCampaign(db)
  const region = createRegion(db, { campaignId: campaign.id, name: 'Oakhollow', description: '...' })
  const sourceNpc = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Mira',
    role: 'shopkeeper',
    disposition: 'friendly'
  })
  const otherNpc = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Gareth',
    role: 'guard',
    disposition: 'neutral'
  })
  const embedder = createFakeEmbedder()
  const sharedQuery = 'healing potion ambush'
  appendNpcMemory(
    db,
    { npcId: sourceNpc.id, content: 'Sold the party a healing potion before joining.', tags: [] },
    { embedder }
  )
  appendNpcMemory(
    db,
    { npcId: otherNpc.id, content: 'Healing potion ambush trap near the bridge.', tags: [] },
    { embedder }
  )
  await flushRagIndexing()
  const character = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Mira',
    characterClass: 'cleric',
    kind: 'ai_party_member',
    sourceNpcId: sourceNpc.id
  })
  const context = await assemblePartyMemberContext(db, campaign.id, character, {
    embedder,
    query: sharedQuery
  })
  expect(context.priorNpcMemories.some((memory) => memory.content.includes('before joining'))).toBe(true)
  expect(context.priorNpcMemories.some((memory) => memory.content.includes('bridge'))).toBe(false)
}

async function hasNoPriorMemoriesWhenNotPromoted(): Promise<void> {
  const db = createTestDb()
  const campaign = seedCampaign(db)
  const embedder = createFakeEmbedder()
  const character = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Brom',
    characterClass: 'ranger',
    kind: 'ai_party_member'
  })
  const context = await assemblePartyMemberContext(db, campaign.id, character, { embedder })
  expect(context.priorNpcMemories).toEqual([])
}

describe('assemblePartyMemberContext RAG isolation', () => {
  it('carries source NPC memories via RAG without other NPC private memories', carriesSourceNpcMemoriesWithoutLeak)
  it('has no prior memories when not promoted from an NPC', hasNoPriorMemoriesWhenNotPromoted)
})