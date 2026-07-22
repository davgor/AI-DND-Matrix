import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { advanceInGameDate, createCampaign, getCampaignById } from './campaigns'
import {
  createCharacter,
  getCharacterById,
  touchCharacterLastActiveInGameDate
} from './characters'

function seedSharedTimeCampaign() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Shared Time',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
  return { db, campaign }
}

// EPIC-133 — per-PC last-active world-day watermark
describe('characters repository: shared-time watermark default (133.2)', () => {
  it('defaults lastActiveInGameDate to 0 for new and legacy-shaped rows', () => {
    const { db, campaign } = seedSharedTimeCampaign()
    const created = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Alice',
      characterClass: 'fighter',
      kind: 'player'
    })
    expect(created.lastActiveInGameDate).toBe(0)
    expect(getCharacterById(db, created.id)?.lastActiveInGameDate).toBe(0)
  })
})

describe('characters repository: shared-time watermark touch (133.2)', () => {
  it('updates watermark to the current campaign world day on touch', () => {
    const { db, campaign } = seedSharedTimeCampaign()
    const alice = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Alice',
      characterClass: 'fighter',
      kind: 'player'
    })
    advanceInGameDate(db, campaign.id, 5)
    const worldDay = getCampaignById(db, campaign.id)!.inGameDate
    touchCharacterLastActiveInGameDate(db, alice.id, worldDay)
    expect(getCharacterById(db, alice.id)?.lastActiveInGameDate).toBe(5)
    expect(worldDay).toBe(5)
  })
})

describe('characters repository: shared-time watermark monotonic (133.2)', () => {
  it('does not lower an already-higher watermark (monotonic)', () => {
    const { db, campaign } = seedSharedTimeCampaign()
    const alice = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Alice',
      characterClass: 'fighter',
      kind: 'player'
    })
    touchCharacterLastActiveInGameDate(db, alice.id, 10)
    touchCharacterLastActiveInGameDate(db, alice.id, 7)
    expect(getCharacterById(db, alice.id)?.lastActiveInGameDate).toBe(10)
  })
})
