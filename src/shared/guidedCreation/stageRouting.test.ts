import { describe, expect, it } from 'vitest'
import type { Character } from '../../db/repositories/characters'
import { canEnterPlay, stageAfterCampaignSelect } from './stageRouting'

function player(phase: Character['guidedCreationPhase']): Character {
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
    guidedCreationPhase: phase,
    alignment: null,
    pendingAlignmentShift: null,
    lifeStatus: 'alive',
    diedAt: null,
    deathCause: null,
    obituary: null,
    ownerPlayerCharacterId: null
  }
}

describe('guided creation stage routing', () => {
  it('blocks play until guided creation is complete', () => {
    expect(canEnterPlay(player('identity'))).toBe(false)
    expect(canEnterPlay(player('opening_scene'))).toBe(false)
    expect(canEnterPlay(player('complete'))).toBe(true)
  })

  it('resumes the correct onboarding stage after campaign select', () => {
    expect(stageAfterCampaignSelect([])).toBe('review')
    expect(stageAfterCampaignSelect([player('identity')])).toBe('guidedIdentity')
    expect(stageAfterCampaignSelect([player('opening_scene')])).toBe('guidedOpeningScene')
    expect(stageAfterCampaignSelect([player('complete')])).toBe('campaignHub')
  })
})
