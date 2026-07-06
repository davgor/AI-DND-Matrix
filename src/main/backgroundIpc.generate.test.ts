import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter, getCharacterById } from '../db/repositories/characters'
import { createCampaignRace } from '../db/repositories/campaignRaces'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { BACKGROUND_ROSTER } from '../engine/characterBackground/roster'
import { generateBackgroundStoryForCharacter, getBackgroundRoster } from './backgroundIpc'

const LORE = {
  summary: 'Elves are reclusive.',
  appearance: 'Slender.',
  culture: 'Forest-bound.',
  roleInThisLand: 'Keepers.',
  hooks: ['A grove dies.']
}

describe('getBackgroundRoster', () => {
  it('returns engine-authored roster entries', () => {
    expect(getBackgroundRoster()).toEqual(BACKGROUND_ROSTER)
  })
})

describe('generateBackgroundStoryForCharacter without prompt', () => {
  it('generates story without writing to the database', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'C', premisePrompt: 'p', deathMode: 'legendary' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player',
      guidedCreationPhase: 'background',
      stats: { abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 } }
    })
    const provider = createScriptedProvider(['Years on the march shaped me.'])
    const story = await generateBackgroundStoryForCharacter(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      backgroundKey: 'soldier'
    })
    expect(story).toBe('Years on the march shaped me.')
    expect(getCharacterById(db, player.id)?.backgroundStory).toBeNull()
  })
})

describe('generateBackgroundStoryForCharacter with race lore', () => {
  it('includes player prompt and race lore in the assembled prompt', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'C', premisePrompt: 'p', deathMode: 'legendary' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player',
      guidedCreationPhase: 'background',
      raceKey: 'elf',
      stats: { abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 } }
    })
    createCampaignRace(db, {
      campaignId: campaign.id,
      raceKey: 'elf',
      kind: 'preset',
      label: 'Elf',
      seedPrompt: 'Long-lived.',
      lore: LORE
    })
    const provider = createScriptedProvider(['Forest service before the road.'])
    await generateBackgroundStoryForCharacter(db, provider, {
      campaignId: campaign.id,
      characterId: player.id,
      backgroundKey: 'soldier',
      playerPrompt: 'Mention the grove.'
    })
    expect(provider.calls[0]?.prompt).toContain('Mention the grove.')
    expect(provider.calls[0]?.prompt).toContain(LORE.summary)
  })
})

describe('generateBackgroundStoryForCharacter validation', () => {
  it('rejects unknown background keys', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'C', premisePrompt: 'p', deathMode: 'legendary' })
    const player = createCharacter(db, {
      campaignId: campaign.id,
      name: 'Hero',
      characterClass: 'fighter',
      kind: 'player'
    })
    const provider = createScriptedProvider(['Story.'])
    await expect(
      generateBackgroundStoryForCharacter(db, provider, {
        campaignId: campaign.id,
        characterId: player.id,
        backgroundKey: 'bogus'
      })
    ).rejects.toThrow('invalid_background_key')
  })
})
