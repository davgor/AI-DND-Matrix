import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { setGuidedCreationPhase } from '../db/repositories/guidedCreation'
import { applyStartingLoadout } from '../db/repositories/startingLoadout'
import { createPlayerCharacter } from './characterCreationIpc'
import { getStartingLoadoutOffer } from './startingLoadoutIpc'

function seedFighterWithAppliedLoadout(db: ReturnType<typeof createTestDb>) {
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
  setGuidedCreationPhase(db, player.id, 'equipment')
  applyStartingLoadout(db, player.id, {
    weaponName: 'Longsword',
    armorName: 'Chain Hauberk',
    offHandChoice: 'Wooden Shield',
    spellKeys: ['rallying-strike']
  })
  setGuidedCreationPhase(db, player.id, 'equipment')
  return player
}

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
    if (result.ok) {
      expect(result.previousSelections).toBeUndefined()
    }
  })

  it('includes previousSelections after starting loadout was applied and phase reverted', () => {
    const db = createTestDb()
    const player = seedFighterWithAppliedLoadout(db)
    const result = getStartingLoadoutOffer(db, { characterId: player.id })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.previousSelections).toEqual({
      weaponName: 'Longsword',
      armorName: 'Chain Hauberk',
      offHandItemName: 'Wooden Shield',
      spellKeys: ['rallying-strike']
    })
  })

  it('returns not_found for unknown character id', () => {
    const db = createTestDb()
    expect(getStartingLoadoutOffer(db, { characterId: 'missing' })).toEqual({
      ok: false,
      reason: 'not_found'
    })
  })
})
