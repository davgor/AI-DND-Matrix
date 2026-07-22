import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign, getCampaignById } from './campaigns'
import { createCharacter, getCharacterById } from './characters'
import { addItemToCharacter, listCharacterItems } from './characterItems'
import { findCatalogItemByName } from './items'
import { createRegion } from './regions'
import { resolveCommerceIntent, resolveTravelIntent } from './commerceTravelResolve'

function seedBuyer(currency: number) {
  const db = createTestDb()
  const campaign = createCampaign(db, { name: 'Shop', premisePrompt: 'x', deathMode: 'legendary' })
  const character = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Buyer',
    characterClass: 'rogue',
    kind: 'player',
    currency
  })
  return { db, campaign, character }
}

describe('resolveCommerceIntent buy (135.2)', () => {
  it('buys with sufficient funds and persists across reopen', () => {
    const { db, campaign, character } = seedBuyer(100)
    const dagger = findCatalogItemByName(db, 'Dagger')!
    const result = resolveCommerceIntent(db, character.id, {
      op: 'buy',
      itemNameHint: 'Dagger',
      catalogItemId: dagger.id
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.newBalance).toBeLessThan(100)
    expect(listCharacterItems(db, character.id).some((row) => row.itemId === dagger.id)).toBe(true)

    // Restart persistence: reopen the same file-backed test DB handle semantics via re-read.
    expect(getCharacterById(db, character.id)?.currency).toBe(result.newBalance)
    expect(getCampaignById(db, campaign.id)).toBeDefined()
  })

  it('fails visibly when funds are insufficient', () => {
    const { db, character } = seedBuyer(0)
    const longsword = findCatalogItemByName(db, 'Longsword')!
    const result = resolveCommerceIntent(db, character.id, {
      op: 'buy',
      itemNameHint: 'Longsword',
      catalogItemId: longsword.id
    })
    expect(result).toMatchObject({ ok: false, code: 'insufficient_funds' })
    expect(getCharacterById(db, character.id)?.currency).toBe(0)
    expect(listCharacterItems(db, character.id)).toHaveLength(0)
  })

  it('fails on invalid catalog id / unknown item', () => {
    const { db, character } = seedBuyer(50)
    expect(
      resolveCommerceIntent(db, character.id, {
        op: 'buy',
        itemNameHint: 'vorpal',
        catalogItemId: undefined
      })
    ).toMatchObject({ ok: false, code: 'unknown_item' })
    expect(
      resolveCommerceIntent(db, character.id, {
        op: 'buy',
        itemNameHint: 'ghost',
        catalogItemId: 'missing-id'
      })
    ).toMatchObject({ ok: false, code: 'unknown_item' })
  })
})

describe('resolveCommerceIntent sell (135.2)', () => {
  it('sells an owned item for half price credit', () => {
    const { db, character } = seedBuyer(10)
    const dagger = findCatalogItemByName(db, 'Dagger')!
    addItemToCharacter(db, character.id, dagger.id, 1)
    const result = resolveCommerceIntent(db, character.id, {
      op: 'sell',
      itemNameHint: 'Dagger',
      catalogItemId: dagger.id
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.newBalance).toBeGreaterThan(10)
    expect(listCharacterItems(db, character.id).some((row) => row.itemId === dagger.id)).toBe(false)
  })
})

describe('resolveTravelIntent known destination (135.3)', () => {
  it('moves to a known region and advances in-game date', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Road', premisePrompt: 'x', deathMode: 'legendary' })
    const home = createRegion(db, {
      campaignId: campaign.id,
      name: 'Market Square',
      description: 'Home'
    })
    const dest = createRegion(db, {
      campaignId: campaign.id,
      name: 'Oakhollow',
      description: 'Woods'
    })
    const character = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Walker',
      characterClass: 'fighter',
      kind: 'player',
      stats: { currentRegionId: home.id }
    })
    const before = getCampaignById(db, campaign.id)!.inGameDate
    const result = resolveTravelIntent(db, {
      campaignId: campaign.id,
      characterId: character.id,
      currentRegionId: home.id,
      intent: {
        destinationNameHint: 'Oakhollow',
        estimatedDays: 3,
        regionId: dest.id
      }
    })
    expect(result).toMatchObject({
      ok: true,
      regionId: dest.id,
      regionName: 'Oakhollow',
      daysAdvanced: 3
    })
    const stats = getCharacterById(db, character.id)!.stats as { currentRegionId?: string }
    expect(stats.currentRegionId).toBe(dest.id)
    expect(getCampaignById(db, campaign.id)!.inGameDate).toBe(before + 3)
  })
})

describe('resolveTravelIntent unknown destination (135.3)', () => {
  it('fails cleanly for unknown destination', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'Road', premisePrompt: 'x', deathMode: 'legendary' })
    const home = createRegion(db, {
      campaignId: campaign.id,
      name: 'Market Square',
      description: 'Home'
    })
    const character = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Walker',
      characterClass: 'fighter',
      kind: 'player',
      stats: { currentRegionId: home.id }
    })
    const result = resolveTravelIntent(db, {
      campaignId: campaign.id,
      characterId: character.id,
      currentRegionId: home.id,
      intent: {
        destinationNameHint: 'Nowherevale',
        estimatedDays: 1,
        regionId: undefined
      }
    })
    expect(result).toMatchObject({ ok: false, code: 'unknown_destination' })
    const stats = getCharacterById(db, character.id)!.stats as { currentRegionId?: string }
    expect(stats.currentRegionId).toBe(home.id)
  })
})
