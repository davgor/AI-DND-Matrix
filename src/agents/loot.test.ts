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
  it('includes policy envelope and retrieve-first instruction', () => {
    const prompt = buildLootPrompt(beastContext, beastPolicy, [])
    expect(prompt).toContain('allowed types: misc')
    expect(prompt).toContain('Retrieve-first')
    expect(prompt).toContain('wolves and beasts')
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
})
