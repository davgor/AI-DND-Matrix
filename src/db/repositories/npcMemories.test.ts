import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { appendNpcMemory, listNpcMemoriesByNpc } from './npcMemories'
import { createNpc } from './npcs'
import { createRegion } from './regions'

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
  return { npcA, npcB }
}

describe('npcMemories repository', () => {
  it('appends a memory and lists it back for that NPC', () => {
    const db = createTestDb()
    const { npcA } = seedTwoNpcs(db)

    const created = appendNpcMemory(db, {
      npcId: npcA.id,
      content: 'The player asked about the burned village.',
      tags: ['village', 'firebomb']
    })

    expect(listNpcMemoriesByNpc(db, npcA.id)).toEqual([created])
  })

  it('never returns another NPC memories, even within the same campaign/region', () => {
    const db = createTestDb()
    const { npcA, npcB } = seedTwoNpcs(db)

    appendNpcMemory(db, { npcId: npcA.id, content: "A's secret", tags: [] })
    appendNpcMemory(db, { npcId: npcB.id, content: "B's secret", tags: [] })

    const memoriesForA = listNpcMemoriesByNpc(db, npcA.id)

    expect(memoriesForA).toHaveLength(1)
    expect(memoriesForA[0]?.content).toBe("A's secret")
    expect(memoriesForA.some((m) => m.content === "B's secret")).toBe(false)
  })

  it('respects an optional recency limit, returning the most recent entries', () => {
    const db = createTestDb()
    const { npcA } = seedTwoNpcs(db)

    appendNpcMemory(db, { npcId: npcA.id, content: 'first', tags: [] })
    appendNpcMemory(db, { npcId: npcA.id, content: 'second', tags: [] })
    appendNpcMemory(db, { npcId: npcA.id, content: 'third', tags: [] })

    const limited = listNpcMemoriesByNpc(db, npcA.id, 2)

    expect(limited.map((m) => m.content)).toEqual(['second', 'third'])
  })
})
