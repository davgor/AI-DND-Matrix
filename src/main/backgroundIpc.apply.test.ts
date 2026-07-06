import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter, getCharacterById } from '../db/repositories/characters'
import { readGuidedCreationFields } from '../db/repositories/guidedCreation'
import { applyBackgroundSelection } from './backgroundIpc'

describe('applyBackgroundSelection happy path', () => {
  it('persists background and advances phase to equipment', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'C', premisePrompt: 'p', deathMode: 'legendary' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player',
      guidedCreationPhase: 'background'
    })
    const result = await applyBackgroundSelection(db, {
      campaignId: campaign.id,
      characterId: player.id,
      backgroundKey: 'soldier',
      backgroundStory: 'I marched for years.'
    })
    expect(result.ok).toBe(true)
    const updated = getCharacterById(db, player.id)
    expect(updated?.backgroundKey).toBe('soldier')
    expect(updated?.backgroundStory).toBe('I marched for years.')
    expect(readGuidedCreationFields(db, player.id)?.guidedCreationPhase).toBe('equipment')
  })

  it('persists empty story as null', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'C', premisePrompt: 'p', deathMode: 'legendary' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player',
      guidedCreationPhase: 'background'
    })
    const result = await applyBackgroundSelection(db, {
      campaignId: campaign.id,
      characterId: player.id,
      backgroundKey: 'noble',
      backgroundStory: '   '
    })
    expect(result.ok).toBe(true)
    expect(getCharacterById(db, player.id)?.backgroundStory).toBeNull()
  })
})

describe('applyBackgroundSelection rejections', () => {
  it('rejects wrong phase', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'C', premisePrompt: 'p', deathMode: 'legendary' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player',
      guidedCreationPhase: 'race'
    })
    const result = await applyBackgroundSelection(db, {
      campaignId: campaign.id,
      characterId: player.id,
      backgroundKey: 'soldier',
      backgroundStory: 'Story.'
    })
    expect(result).toEqual({ ok: false, reason: 'invalid_phase' })
  })

  it('rejects unknown background keys', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'C', premisePrompt: 'p', deathMode: 'legendary' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player',
      guidedCreationPhase: 'background'
    })
    const result = await applyBackgroundSelection(db, {
      campaignId: campaign.id,
      characterId: player.id,
      backgroundKey: 'bogus',
      backgroundStory: 'Story.'
    })
    expect(result).toEqual({ ok: false, reason: 'invalid_background_key' })
  })
})
