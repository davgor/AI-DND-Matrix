import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { appendNpcMemory } from '../db/repositories/npcMemories'
import { createNpc, getNpcById } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { createWorldFact } from '../db/repositories/worldFacts'
import { createScriptedProvider } from './providers/mockHarness'
import { assembleNpcContext, generateNpcReaction } from './npc'

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
    expect(context.memories.every((m) => m.content.startsWith("A's"))).toBe(true)
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

    expect(context.worldFacts).toEqual([matchingFact.content])
  })

  it('windows world facts to the most recent 10 as content strings (040.4)', () => {
    const db = createTestDb()
    const { campaign, region, npcA } = seedTwoNpcs(db)
    for (let index = 0; index < 15; index += 1) {
      createWorldFact(db, {
        campaignId: campaign.id,
        regionId: region.id,
        content: `Fact number ${index}`,
        createdAt: `2026-01-01T00:00:${String(index).padStart(2, '0')}.000Z`
      })
    }

    const context = assembleNpcContext(db, npcA)

    expect(context.worldFacts).toHaveLength(10)
    expect(context.worldFacts[0]).toBe('Fact number 5')
    expect(context.worldFacts[9]).toBe('Fact number 14')
  })
})

describe('generateNpcReaction backstory', () => {
  it('includes persisted backstory in speaking NPC prompts', async () => {
    const db = createTestDb()
    const { npcA } = seedTwoNpcs(db)
    db.prepare('UPDATE npcs SET backstory = ? WHERE id = ?').run(
      'Bram has chopped wood on this lane for twenty years.',
      npcA.id
    )
    const npc = getNpcById(db, npcA.id)!
    const provider = createScriptedProvider(['{"dialogue":"Evening."}'])
    await generateNpcReaction(provider, npc, assembleNpcContext(db, npc), 'The player arrives.')
    expect(provider.calls[0]?.prompt).toContain('Bram has chopped wood')
    expect(provider.calls[0]?.prompt).toContain('do not contradict')
  })
})

describe('generateNpcReaction dialogue', () => {
  it('returns the NPC dialogue with no attack when none is proposed', async () => {
    const db = createTestDb()
    const { npcA } = seedTwoNpcs(db)
    const context = assembleNpcContext(db, npcA)
    const provider = createScriptedProvider(['{"dialogue":"Welcome, traveler."}'])

    const reaction = await generateNpcReaction(provider, npcA, context, 'The player enters the village.')

    expect(reaction).toEqual({ reactionKind: 'dialogue', text: 'Welcome, traveler.' })
  })

  it('flags a hostile attack, leaving the actual resolution to the engine', async () => {
    const db = createTestDb()
    const { npcA } = seedTwoNpcs(db)
    const context = assembleNpcContext(db, npcA)
    const provider = createScriptedProvider(['{"dialogue":"Die!","attack":true}'])

    const reaction = await generateNpcReaction(provider, npcA, context, 'The player attacks.')

    expect(reaction).toEqual({ reactionKind: 'dialogue', text: 'Die!', attack: true })
  })

  it('returns a wrapped action description for a non-speaking NPC', async () => {
    const db = createTestDb()
    const { campaign, region } = seedTwoNpcs(db)
    const wolf = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Wolf',
      role: 'beast',
      disposition: 'hostile',
      temperament: 'aggressive',
      canSpeak: false
    })
    const context = assembleNpcContext(db, wolf)
    const provider = createScriptedProvider(['{"actionDescription":"The wolf lunges at your throat."}'])

    const reaction = await generateNpcReaction(provider, wolf, context, 'The player approaches.')

    expect(reaction).toEqual({
      reactionKind: 'action',
      text: '**The wolf lunges at your throat.**'
    })
  })
})
