import { describe, expect, it } from 'vitest'
import { buildLootPrompt, parseLootAgentResponse, resolveLoot } from './loot'
import { createScriptedProvider } from './providers/mockHarness'
import type { LootContext, LootPolicy } from '../shared/loot/types'

const beastPolicy: LootPolicy = {
  allowedItemTypes: ['misc'],
  maxRarity: 'common',
  maxGrantCount: 2,
  catalogRetrieveFirst: true
}

const beastContext: LootContext = {
  source: 'encounter_end',
  foes: [{ npcId: 'w1', npcRole: 'wolf', combatTier: 'catalog', buckets: ['beast'], outcome: 'slain' }],
  regionId: 'r1',
  playerLevel: 2,
  playerCharacterId: 'c1',
  campaignId: 'camp1'
}

describe('parseLootAgentResponse', () => {
  it('accepts valid response with nothingToFind', () => {
    const parsed = parseLootAgentResponse(
      { narrationText: 'Nothing here.', itemGrants: [], nothingToFind: true },
      2
    )
    expect(parsed?.nothingToFind).toBe(true)
    expect(parsed?.itemGrants).toEqual([])
  })

  it('rejects nothingToFind with grants', () => {
    const parsed = parseLootAgentResponse(
      {
        narrationText: 'Odd.',
        itemGrants: [{ proposeNew: { name: 'Fang', description: 'x', itemType: 'misc', rarityTier: 'common' } }],
        nothingToFind: true
      },
      2
    )
    expect(parsed).toBeNull()
  })

  it('caps grants to maxGrantCount', () => {
    const parsed = parseLootAgentResponse(
      {
        narrationText: 'Loot.',
        itemGrants: [
          { proposeNew: { name: 'A', description: 'a', itemType: 'misc', rarityTier: 'common' } },
          { proposeNew: { name: 'B', description: 'b', itemType: 'misc', rarityTier: 'common' } },
          { proposeNew: { name: 'C', description: 'c', itemType: 'misc', rarityTier: 'common' } }
        ],
        nothingToFind: false
      },
      2
    )
    expect(parsed?.itemGrants).toHaveLength(2)
  })
})

describe('buildLootPrompt', () => {
  it('includes the policy envelope — static realism/retrieve-first rules moved to systemPrompt (040.9)', () => {
    const prompt = buildLootPrompt(beastContext, beastPolicy, [])
    expect(prompt).toContain('allowed types: misc')
    expect(prompt).not.toContain('Retrieve-first')
    expect(prompt).not.toContain('wolves and beasts')
    expect(prompt).not.toContain('Respond ONLY with JSON')
  })
})

describe('resolveLoot', () => {
  it('returns misc-only grants for beast policy via scripted provider', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({
        narrationText: 'You collect a wolf fang.',
        itemGrants: [
          { proposeNew: { name: 'Wolf Fang', description: 'A trophy.', itemType: 'misc', rarityTier: 'common' } }
        ],
        nothingToFind: false
      })
    ])
    const result = await resolveLoot(provider, beastContext, beastPolicy, [])
    expect(result.itemGrants).toHaveLength(1)
    expect(provider.calls[0]?.prompt).toContain('misc')
  })

  it('falls back to nothingToFind on invalid schema', async () => {
    const provider = createScriptedProvider(['not json', 'still bad', 'nope'])
    const result = await resolveLoot(provider, beastContext, beastPolicy, [])
    expect(result.nothingToFind).toBe(true)
    expect(result.itemGrants).toHaveLength(0)
  })

  it('moves the loot schema and static rules into systemPrompt (040.9)', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({ narrationText: 'Nothing here.', itemGrants: [], nothingToFind: true })
    ])

    await resolveLoot(provider, beastContext, beastPolicy, [])

    const call = provider.calls[0]!
    expect(call.prompt).toContain('allowed types: misc')
    expect(call.prompt).not.toContain('Respond ONLY with JSON')
    const system = call.context?.systemPrompt ?? ''
    expect(system).toContain('Respond ONLY with JSON: {"narrationText":string,"itemGrants"')
    expect(system).toContain('Retrieve-first')
    expect(system).toContain('wolves and beasts')
    expect(system).toContain('no markdown fences')
    expect(call.context?.maxTokens).toBe(384)
  })

  it('passes the identical GenerateContext object on every retry attempt (data-integrity item 11)', async () => {
    const provider = createScriptedProvider(['not json', 'still bad', 'nope'])

    await resolveLoot(provider, beastContext, beastPolicy, [])

    expect(provider.calls).toHaveLength(3)
    const firstContext = provider.calls[0]?.context
    expect(firstContext?.systemPrompt).toBeTruthy()
    for (const call of provider.calls) {
      expect(call.context).toBe(firstContext)
    }
  })
})
