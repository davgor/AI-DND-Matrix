import { describe, expect, it } from 'vitest'
import type { Character } from '../../db/repositories/characters'
import { isHubEligible } from './types'

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
    ...overrides
  }
}

describe('campaign hub shared types', () => {
  it('hub is eligible when at least one player has completed guided creation', () => {
    expect(isHubEligible([])).toBe(false)
    expect(isHubEligible([player({ guidedCreationPhase: 'identity' })])).toBe(false)
    expect(isHubEligible([player({ guidedCreationPhase: 'complete' })])).toBe(true)
    expect(
      isHubEligible([
        player({ id: 'p1', guidedCreationPhase: 'identity' }),
        player({ id: 'p2', guidedCreationPhase: 'complete' })
      ])
    ).toBe(true)
  })

  it('ignores ai_party_member rows for hub eligibility', () => {
    expect(
      isHubEligible([
        player({ kind: 'ai_party_member', guidedCreationPhase: 'none' })
      ])
    ).toBe(false)
  })
})
