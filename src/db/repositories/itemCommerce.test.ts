import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createCharacter, getCharacterById } from './characters'
import { findCatalogItemByName } from './items'
import { persistNarrationCommerce } from './itemCommerce'

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
  return { db, character }
}

describe('persistNarrationCommerce grants', () => {
  it('grants currency via narration', () => {
    const { db, character } = seedBuyer(10)
    const effect = persistNarrationCommerce(db, character.id, { currencyGrants: { amount: 25 } })
    expect(effect.currencyGranted).toBe(25)
    expect(effect.currencyBalance).toBe(35)
    expect(getCharacterById(db, character.id)?.currency).toBe(35)
  })
})

describe('persistNarrationCommerce purchases', () => {
  it('purchases items at engine prices', () => {
    const { db, character } = seedBuyer(100)
    const dagger = findCatalogItemByName(db, 'Dagger')!
    const effect = persistNarrationCommerce(db, character.id, {
      itemPurchases: [{ catalogItemId: dagger.id }]
    })
    expect(effect.purchases[0]).toMatchObject({ ok: true, catalogItemId: dagger.id })
    expect(getCharacterById(db, character.id)?.currency).toBeLessThan(100)
  })

  it('rejects purchase when funds are insufficient', () => {
    const { db, character } = seedBuyer(0)
    const longsword = findCatalogItemByName(db, 'Longsword')!
    const effect = persistNarrationCommerce(db, character.id, {
      itemPurchases: [{ catalogItemId: longsword.id }]
    })
    expect(effect.purchases[0]).toEqual({
      catalogItemId: longsword.id,
      ok: false,
      reason: 'insufficient_funds'
    })
    expect(getCharacterById(db, character.id)?.currency).toBe(0)
  })
})
