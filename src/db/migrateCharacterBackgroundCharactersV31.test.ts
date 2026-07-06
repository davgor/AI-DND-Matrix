import { describe, expect, it } from 'vitest'
import { createTestDb } from './testUtils'
import { createCharacter, getCharacterById } from './repositories/characters'
import { createCampaign } from './repositories/campaigns'
import { GUIDED_CREATION_PHASES } from '../shared/guidedCreation/types'

describe('character background migration phase list (050.2)', () => {
  it('includes background in guided creation phases', () => {
    expect(GUIDED_CREATION_PHASES).toEqual([
      'none',
      'race',
      'background',
      'equipment',
      'identity',
      'opening_scene',
      'complete'
    ])
  })
})

describe('character background migration defaults (050.2)', () => {
  it('defaults new player characters to race guided-creation phase', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'M',
      premisePrompt: 'p',
      deathMode: 'legendary'
    })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player'
    })
    expect(player.guidedCreationPhase).toBe('race')
  })

  it('defaults background columns to null for pre-existing-style rows', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'M',
      premisePrompt: 'p',
      deathMode: 'legendary'
    })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Legacy',
      characterClass: 'fighter',
      kind: 'player',
      guidedCreationPhase: 'equipment'
    })
    expect(player.backgroundKey).toBeNull()
    expect(player.backgroundStory).toBeNull()
  })
})

describe('character background migration round-trip (050.2)', () => {
  it('allows background phase on insert and round-trips background columns', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'M',
      premisePrompt: 'p',
      deathMode: 'legendary'
    })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player',
      guidedCreationPhase: 'background',
      backgroundKey: 'soldier',
      backgroundStory: 'I marched for years.'
    })
    expect(player.guidedCreationPhase).toBe('background')
    expect(player.backgroundKey).toBe('soldier')
    expect(player.backgroundStory).toBe('I marched for years.')

    const reloaded = getCharacterById(db, player.id)
    expect(reloaded?.backgroundKey).toBe('soldier')
    expect(reloaded?.backgroundStory).toBe('I marched for years.')
  })
})
