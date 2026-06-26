import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { adjustCharacterCurrency, createCharacter, getCharacterById } from './characters'

function seedCharacter(db: ReturnType<typeof createTestDb>, currency = 10) {
  const campaign = createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
  return createCharacter(db, {
    campaignId: campaign.id,
    name: 'Elowen',
    characterClass: 'Ranger',
    kind: 'player',
    currency
  })
}

describe('characters repository: currency guard', () => {
  it('defaults a new character to currency 0 unless explicitly set', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Test',
      premisePrompt: '...',
      deathMode: 'legendary'
    })
    const created = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Elowen',
      characterClass: 'Ranger',
      kind: 'player'
    })

    expect(created.currency).toBe(0)
  })

  it('applies a valid adjustment that keeps the balance at or above zero', () => {
    const db = createTestDb()
    const character = seedCharacter(db, 10)

    const result = adjustCharacterCurrency(db, character.id, -5)

    expect(result).toEqual({ success: true, newBalance: 5 })
    expect(getCharacterById(db, character.id)?.currency).toBe(5)
  })

  it('rejects an adjustment that would push the balance below zero, leaving it unchanged', () => {
    const db = createTestDb()
    const character = seedCharacter(db, 10)

    const result = adjustCharacterCurrency(db, character.id, -50)

    expect(result).toEqual({ success: false, reason: 'insufficient_funds' })
    expect(getCharacterById(db, character.id)?.currency).toBe(10)
  })
})
