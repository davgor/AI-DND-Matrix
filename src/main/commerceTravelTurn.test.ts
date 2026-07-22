import { describe, expect, it } from 'vitest'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { createTestDb } from '../db/testUtils'
import { createCampaign, getCampaignById } from '../db/repositories/campaigns'
import { createCharacter, getCharacterById } from '../db/repositories/characters'
import { listCharacterItems } from '../db/repositories/characterItems'
import { findCatalogItemByName } from '../db/repositories/items'
import { createNpc } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { resolvePlayerTurn } from './turnIpc'

function mergedTurn(intent: object, ...beats: object[]) {
  return JSON.stringify({ intent, routingPlan: { disposition: 'composite', beats } })
}

function seedMarket() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Commerce Travel',
    premisePrompt: 'market',
    deathMode: 'legendary'
  })
  const home = createRegion(db, {
    campaignId: campaign.id,
    name: 'Market Square',
    description: 'Stalls'
  })
  const oakhollow = createRegion(db, {
    campaignId: campaign.id,
    name: 'Oakhollow',
    description: 'Woods'
  })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Kael',
    characterClass: 'fighter',
    kind: 'player',
    currency: 100,
    stats: { currentRegionId: home.id, abilityScores: { body: 12, agility: 12, mind: 10, presence: 10 } }
  })
  const shopkeeper = createNpc(db, {
    campaignId: campaign.id,
    regionId: home.id,
    name: 'Tessa',
    role: 'shopkeeper',
    disposition: 'friendly',
    canSpeak: true
  })
  return { db, campaign, home, oakhollow, player, shopkeeper }
}

describe('commerce travel turn wiring: buy without itemPurchases (135.4)', () => {
  it('buys even when narration omits itemPurchases (converse-only social route)', async () => {
    const { db, campaign, player, shopkeeper } = seedMarket()
    const dagger = findCatalogItemByName(db, 'Dagger')!
    const provider = createScriptedProvider([
      mergedTurn({ checkNeeded: false }, { kind: 'npcResponse', npcIds: [shopkeeper.id] }),
      '{"dialogue":"Pleasure doing business."}'
    ])
    const result = await resolvePlayerTurn(
      db,
      provider,
      {
        campaignId: campaign.id,
        characterId: player.id,
        playerInput: 'I buy a dagger'
      },
      { rng: () => 0.5 }
    )
    expect(result.commerceResolve?.ok).toBe(true)
    expect(result.commerceTravelFeedback).toMatch(/Bought Dagger/i)
    expect(listCharacterItems(db, player.id).some((row) => row.itemId === dagger.id)).toBe(true)
    expect(getCharacterById(db, player.id)!.currency).toBeLessThan(100)
  })
})

describe('commerce travel turn wiring: insufficient funds (135.4)', () => {
  it('surfaces insufficient funds without requiring DM itemPurchases', async () => {
    const { db, campaign, home, shopkeeper } = seedMarket()
    const broke = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Broke',
      characterClass: 'fighter',
      kind: 'player',
      currency: 0,
      stats: {
        currentRegionId: home.id,
        abilityScores: { body: 12, agility: 12, mind: 10, presence: 10 }
      }
    })
    const provider = createScriptedProvider([
      mergedTurn({ checkNeeded: false }, { kind: 'npcResponse', npcIds: [shopkeeper.id] }),
      '{"dialogue":"Come back when you have coin."}'
    ])
    const result = await resolvePlayerTurn(
      db,
      provider,
      {
        campaignId: campaign.id,
        characterId: broke.id,
        playerInput: 'I buy a Longsword'
      },
      { rng: () => 0.5 }
    )
    expect(result.commerceResolve).toMatchObject({ ok: false, code: 'insufficient_funds' })
    expect(result.commerceTravelFeedback).toMatch(/cannot afford/i)
    expect(listCharacterItems(db, broke.id)).toHaveLength(0)
  })
})

describe('commerce travel turn wiring: travel to known region (135.4)', () => {
  it('travels to a known region when LLM omits actionType travel', async () => {
    const { db, campaign, player, oakhollow, shopkeeper } = seedMarket()
    const before = getCampaignById(db, campaign.id)!.inGameDate
    const provider = createScriptedProvider([
      mergedTurn({ checkNeeded: false }, { kind: 'npcResponse', npcIds: [shopkeeper.id] }),
      '{"dialogue":"Safe roads."}'
    ])
    const result = await resolvePlayerTurn(
      db,
      provider,
      {
        campaignId: campaign.id,
        characterId: player.id,
        playerInput: 'I travel to Oakhollow'
      },
      { rng: () => 0.5 }
    )
    expect(result.travelResolve?.ok).toBe(true)
    expect(result.commerceTravelFeedback).toMatch(/Oakhollow/i)
    const stats = getCharacterById(db, player.id)!.stats as { currentRegionId?: string }
    expect(stats.currentRegionId).toBe(oakhollow.id)
    expect(getCampaignById(db, campaign.id)!.inGameDate).toBeGreaterThan(before)
  })
})

describe('commerce travel turn wiring: local landmark cues (135.4)', () => {
  it('does not overlay travel for local landmark cues without a known region', async () => {
    const { db, campaign, player } = seedMarket()
    const provider = createScriptedProvider([
      mergedTurn({ checkNeeded: false }, { kind: 'dmNarration' }),
      '{"narrationText":"Cool water fills your waterskin."}'
    ])
    const result = await resolvePlayerTurn(
      db,
      provider,
      {
        campaignId: campaign.id,
        characterId: player.id,
        playerInput: 'I head to the well for water'
      },
      { rng: () => 0.5 }
    )
    expect(result.travelResolve).toBeUndefined()
    expect(result.narrationText).toMatch(/waterskin/i)
  })
})
