import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createPlayerCharacter } from './characterCreationIpc'
import { getStartingLoadoutOffer } from './startingLoadoutIpc'

describe('getStartingLoadoutOffer', () => {
  it('returns an offer for a newly created player character', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Test',
      premisePrompt: 'test',
      deathMode: 'legendary'
    })
    const player = createPlayerCharacter(db, {
      campaignId: campaign.id,
      name: 'Kael',
      archetype: 'fighter',
      abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 },
      alignment: 'lawful_good'
    })

    const result = getStartingLoadoutOffer(db, { characterId: player.id })
    expect(result).toEqual({ ok: true, offer: expect.objectContaining({ archetype: 'fighter' }) })
  })

  it('returns not_found for unknown character id', () => {
    const db = createTestDb()
    expect(getStartingLoadoutOffer(db, { characterId: 'missing' })).toEqual({
      ok: false,
      reason: 'not_found'
    })
  })
})
