import { describe, expect, it } from 'vitest'
import { getCharacterById } from '../db/repositories/characters'
import { applyPlayerDefeatOutcome } from './playerDefeat'
import { createNpc } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { persistCharacterDeath } from './characterDeath'
import { killViaDying, seedDeathCampaign } from './characterDeath.testUtils'

describe('character death persistence: combat paths', () => {
  it('legendary lost dying sequence sets life_status dead', () => {
    const { db, campaign, character } = seedDeathCampaign('legendary')
    killViaDying(db, campaign.id, character.id)
    expect(getCharacterById(db, character.id)?.lifeStatus).toBe('dead')
    expect(getCharacterById(db, character.id)?.deathCause).toBe('legendary_dying')
  })

  it('respawn-exhausted death sets life_status dead', () => {
    const { db, campaign, character } = seedDeathCampaign('respawn', {
      location: 'Shrine',
      cost: 10,
      limit: 0
    })
    killViaDying(db, campaign.id, character.id)
    expect(getCharacterById(db, character.id)?.lifeStatus).toBe('dead')
    expect(getCharacterById(db, character.id)?.deathCause).toBe('respawn_exhausted')
  })

  it('execute defeat under legendary sets life_status dead', () => {
    const { db, campaign, character } = seedDeathCampaign('legendary')
    const region = createRegion(db, {
      campaignId: campaign.id,
      name: 'Keep',
      description: '...'
    })
    const victor = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Guard',
      role: 'guard',
      disposition: 'hostile'
    })
    applyPlayerDefeatOutcome({
      db,
      campaignId: campaign.id,
      characterId: character.id,
      victorNpcId: victor.id,
      proposal: { disposition: 'execute', narrationText: 'Executed.' },
      deathMode: 'legendary'
    })
    expect(getCharacterById(db, character.id)?.lifeStatus).toBe('dead')
    expect(getCharacterById(db, character.id)?.deathCause).toBe('execute_defeat')
  })
})

describe('character death persistence: story and standard', () => {
  it('story-driven death persists without dying sequence', () => {
    const { db, character } = seedDeathCampaign('standard')
    persistCharacterDeath({ db, characterId: character.id, deathCause: 'story_sacrifice' })
    expect(getCharacterById(db, character.id)?.lifeStatus).toBe('dead')
    expect(getCharacterById(db, character.id)?.deathCause).toBe('story_sacrifice')
  })

  it('standard combat revert does not set life_status dead', () => {
    const { db, campaign, character } = seedDeathCampaign('standard')
    killViaDying(db, campaign.id, character.id)
    expect(getCharacterById(db, character.id)?.lifeStatus).toBe('alive')
  })
})
