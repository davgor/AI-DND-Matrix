import { describe, expect, it } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter, getCharacterById } from '../db/repositories/characters'
import { readGuidedCreationFields } from '../db/repositories/guidedCreation'
import { applyBackgroundSelection } from './backgroundIpc'

import type { GuidedCreationPhase } from '../shared/guidedCreation/types'

function createBackgroundPhasePlayer(db: Database.Database, phase: GuidedCreationPhase = 'background') {
  const campaign = createCampaign(db, { name: 'C', premisePrompt: 'p', deathMode: 'legendary' })
  const player = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Hero',
    characterClass: 'fighter',
    kind: 'player',
    guidedCreationPhase: phase
  })
  return { campaign, player }
}

describe('applyBackgroundSelection happy path', () => {
  it('persists background and advances phase to equipment', async () => {
    const db = createTestDb()
    const { campaign, player } = createBackgroundPhasePlayer(db)
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
    const { campaign, player } = createBackgroundPhasePlayer(db)
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

describe('applyBackgroundSelection custom', () => {
  it('persists custom background with required label', async () => {
    const db = createTestDb()
    const { campaign, player } = createBackgroundPhasePlayer(db)
    const result = await applyBackgroundSelection(db, {
      campaignId: campaign.id,
      characterId: player.id,
      backgroundKey: 'custom',
      backgroundCustomLabel: 'River Smuggler',
      backgroundStory: 'I ran contraband.'
    })
    expect(result.ok).toBe(true)
    const updated = getCharacterById(db, player.id)
    expect(updated?.backgroundKey).toBe('custom')
    expect(updated?.backgroundCustomLabel).toBe('River Smuggler')
    expect(updated?.backgroundStory).toBe('I ran contraband.')
  })
})

describe('applyBackgroundSelection rejections', () => {
  it('rejects wrong phase', async () => {
    const db = createTestDb()
    const { campaign, player } = createBackgroundPhasePlayer(db, 'race')
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
    const { campaign, player } = createBackgroundPhasePlayer(db)
    const result = await applyBackgroundSelection(db, {
      campaignId: campaign.id,
      characterId: player.id,
      backgroundKey: 'bogus',
      backgroundStory: 'Story.'
    })
    expect(result).toEqual({ ok: false, reason: 'invalid_background_key' })
  })

  it('rejects custom without a label', async () => {
    const db = createTestDb()
    const { campaign, player } = createBackgroundPhasePlayer(db)
    const result = await applyBackgroundSelection(db, {
      campaignId: campaign.id,
      characterId: player.id,
      backgroundKey: 'custom',
      backgroundCustomLabel: '   ',
      backgroundStory: 'Story.'
    })
    expect(result).toEqual({ ok: false, reason: 'invalid_custom_label' })
  })
})
