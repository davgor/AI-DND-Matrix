import { describe, expect, it } from 'vitest'
import { isHubEligible } from '../shared/campaignHub/types'
import { stageAfterCampaignSelect } from '../shared/guidedCreation/stageRouting'
import type { Character } from '../db/repositories/characters'

function player(overrides: Partial<Character> = {}): Character {
  return {
    id: 'p1',
    campaignId: 'c1',
    name: 'Kael',
    characterClass: 'fighter',
    stats: {},
    inventory: [],
    hp: 10,
    xp: 0,
    level: 1,
    currency: 0,
    kind: 'player',
    sourceNpcId: null,
    portraitPath: null,
    sheetBackgroundPath: null,
    identityWho: null,
    identityWhy: null,
    identityWhere: null,
    identityWhat: null,
    openingScene: null,
    guidedCreationPhase: 'complete',
    alignment: null,
    pendingAlignmentShift: null,
    lifeStatus: 'alive',
    diedAt: null,
    deathCause: null,
    obituary: null,
    ownerPlayerCharacterId: null,
    raceKey: null,
    backgroundKey: null,
    backgroundStory: null,
    backgroundCustomLabel: null,
    // EPIC-133
    lastActiveInGameDate: 0,
    ...overrides
  }
}

describe('campaign hub smoke (038.19)', () => {
  it('hub-eligible campaign routes to campaignHub not main', () => {
    const characters = [player({ guidedCreationPhase: 'complete' })]
    expect(isHubEligible(characters)).toBe(true)
    expect(stageAfterCampaignSelect(characters)).toBe('campaignHub')
  })

  it('onboarding campaign in equipment phase routes to equipment selection', () => {
    const characters = [player({ guidedCreationPhase: 'equipment' })]
    expect(isHubEligible(characters)).toBe(false)
    expect(stageAfterCampaignSelect(characters)).toBe('equipmentSelection')
  })

  it('onboarding campaign with incomplete guided creation stays on guided path', () => {
    const characters = [player({ guidedCreationPhase: 'identity' })]
    expect(isHubEligible(characters)).toBe(false)
    expect(stageAfterCampaignSelect(characters)).toBe('guidedIdentity')
  })

  it('multi-character hub eligibility when any player is complete', () => {
    const characters = [
      player({ id: 'p1', guidedCreationPhase: 'complete' }),
      player({ id: 'p2', name: 'Bryn', guidedCreationPhase: 'identity' })
    ]
    expect(isHubEligible(characters)).toBe(true)
    expect(stageAfterCampaignSelect(characters)).toBe('campaignHub')
  })
})
