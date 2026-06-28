import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { appendNpcMemory } from '../db/repositories/npcMemories'
import { createNpc } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { createWorldFact } from '../db/repositories/worldFacts'
import { assembleNpcContext } from './npc'

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

describe('assembleNpcContext', () => {
  it('never includes another NPC memory rows, even when both are seeded in the same test', () => {
    const db = createTestDb()
    const { npcA, npcB } = seedTwoNpcs(db)

    appendNpcMemory(db, { npcId: npcA.id, content: "A's memory 1", tags: [] })
    appendNpcMemory(db, { npcId: npcA.id, content: "A's memory 2", tags: [] })
    appendNpcMemory(db, { npcId: npcB.id, content: "B's memory 1", tags: [] })
    appendNpcMemory(db, { npcId: npcB.id, content: "B's memory 2", tags: [] })

    const context = assembleNpcContext(db, npcA)

    expect(context.npcId).toBe(npcA.id)
    expect(context.memories).toHaveLength(2)
    expect(context.memories.every((m) => m.npcId === npcA.id)).toBe(true)
    expect(context.memories.some((m) => m.content.startsWith('B'))).toBe(false)
  })

  it('limits world facts to those tagged to the NPC region/faction', () => {
    const db = createTestDb()
    const { campaign, region, npcA } = seedTwoNpcs(db)

    const matchingFact = createWorldFact(db, {
      campaignId: campaign.id,
      regionId: region.id,
      content: 'Oakhollow was burned down.'
    })
    createWorldFact(db, {
      campaignId: campaign.id,
      factionTag: 'unrelated-faction',
      content: 'Unrelated faction fact.'
    })

    const context = assembleNpcContext(db, npcA)

    expect(context.worldFacts.map((f) => f.id)).toEqual([matchingFact.id])
  })
})
