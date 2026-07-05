import { describe, expect, it } from 'vitest'
import type { Character } from '../../db/repositories/characters'
import {
  canEnterPlay,
  findGuidedCreationPlayer,
  stageAfterCampaignSelect,
  stageForGuidedPhase
} from './stageRouting'

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
    ownerPlayerCharacterId: null,
    raceKey: null
  }
}

describe('guided creation stage routing', () => {
  it('blocks play until guided creation is complete', () => {
    expect(canEnterPlay(player('equipment'))).toBe(false)
    expect(canEnterPlay(player('identity'))).toBe(false)
    expect(canEnterPlay(player('opening_scene'))).toBe(false)
    expect(canEnterPlay(player('complete'))).toBe(true)
  })

  it('maps guided creation phases to onboarding stages', () => {
    expect(stageForGuidedPhase('race')).toBe('raceSelection')
    expect(stageForGuidedPhase('equipment')).toBe('equipmentSelection')
  })

  it('resumes the correct onboarding stage after campaign select', () => {
    expect(stageAfterCampaignSelect([])).toBe('review')
    expect(stageAfterCampaignSelect([player('race')])).toBe('raceSelection')
    expect(stageAfterCampaignSelect([player('equipment')])).toBe('equipmentSelection')
    expect(stageAfterCampaignSelect([player('identity')])).toBe('guidedIdentity')
    expect(stageAfterCampaignSelect([player('opening_scene')])).toBe('guidedOpeningScene')
    expect(stageAfterCampaignSelect([player('complete')])).toBe('campaignHub')
  })

  it('prefers the race-phase player when multiple players exist', () => {
    const characters = [player('complete'), player('race')]
    expect(findGuidedCreationPlayer(characters)?.guidedCreationPhase).toBe('race')
  })

  it('prefers the equipment-phase player when no race-phase player exists', () => {
    const characters = [player('complete'), player('equipment')]
    expect(findGuidedCreationPlayer(characters)?.guidedCreationPhase).toBe('equipment')
  })
})
