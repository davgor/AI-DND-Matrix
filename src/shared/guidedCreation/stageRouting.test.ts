import { describe, expect, it } from 'vitest'
import type { Character } from '../../db/repositories/characters'
import {
  canEnterPlay,
  findGuidedCreationPlayer,
  findSetupPhasePlayer,
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
    raceKey: null,
    backgroundKey: null,
    backgroundStory: null,
    backgroundCustomLabel: null
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
    expect(stageForGuidedPhase('background')).toBe('backgroundSelection')
    expect(stageForGuidedPhase('equipment')).toBe('equipmentSelection')
    expect(stageForGuidedPhase('companions')).toBe('companionPrompt')
  })

  it('resumes the correct onboarding stage after campaign select', () => {
    expect(stageAfterCampaignSelect([])).toBe('review')
    expect(stageAfterCampaignSelect([player('race')])).toBe('raceSelection')
    expect(stageAfterCampaignSelect([player('background')])).toBe('backgroundSelection')
    expect(stageAfterCampaignSelect([player('equipment')])).toBe('equipmentSelection')
    expect(stageAfterCampaignSelect([player('companions')])).toBe('companionPrompt')
    expect(stageAfterCampaignSelect([player('identity')])).toBe('guidedIdentity')
    expect(stageAfterCampaignSelect([player('opening_scene')])).toBe('guidedOpeningScene')
    expect(stageAfterCampaignSelect([player('complete')])).toBe('campaignHub')
  })

  it('prefers the race-phase player when multiple players exist', () => {
    const characters = [player('complete'), player('race')]
    expect(findGuidedCreationPlayer(characters)?.guidedCreationPhase).toBe('race')
  })

  it('prefers the background-phase player when no race-phase player exists', () => {
    const characters = [player('complete'), player('background')]
    expect(findGuidedCreationPlayer(characters)?.guidedCreationPhase).toBe('background')
  })

  it('prefers the equipment-phase player when no race- or background-phase player exists', () => {
    const characters = [player('complete'), player('equipment')]
    expect(findGuidedCreationPlayer(characters)?.guidedCreationPhase).toBe('equipment')
  })

  it('prefers the companions-phase player when earlier setup phases are done', () => {
    const characters = [player('complete'), player('companions')]
    expect(findGuidedCreationPlayer(characters)?.guidedCreationPhase).toBe('companions')
  })

  it('finds setup-phase players across race, background, equipment, and companions', () => {
    expect(findSetupPhasePlayer([player('complete'), player('background')])?.guidedCreationPhase).toBe(
      'background'
    )
    expect(findSetupPhasePlayer([player('race')])?.guidedCreationPhase).toBe('race')
    expect(findSetupPhasePlayer([player('companions')])?.guidedCreationPhase).toBe('companions')
    expect(findSetupPhasePlayer([player('identity')])?.guidedCreationPhase).toBeUndefined()
  })
})
