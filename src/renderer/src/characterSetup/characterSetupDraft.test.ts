import { describe, expect, it } from 'vitest'
import type { Character } from '../../../db/repositories/characters'
import { buildCharacterSetupDraft, resolveCharacterSetupDraft } from './characterSetupDraft'

function player(overrides: Partial<Character> = {}): Character {
  return {
    id: 'p1',
    campaignId: 'c1',
    name: 'Kael',
    characterClass: 'fighter',
    stats: {
      abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 },
      ac: 11,
      maxHp: 12,
      hitDieRolls: [8]
    },
    inventory: [],
    hp: 12,
    xp: 0,
    level: 1,
    currency: 100,
    kind: 'player',
    sourceNpcId: null,
    portraitPath: '/portrait.png',
    sheetBackgroundPath: null,
    identityWho: null,
    identityWhy: null,
    identityWhere: null,
    identityWhat: null,
    openingScene: null,
    guidedCreationPhase: 'equipment',
    alignment: 'lawful_good',
    pendingAlignmentShift: null,
    lifeStatus: 'alive',
    diedAt: null,
    deathCause: null,
    obituary: null,
    ownerPlayerCharacterId: null,
    raceKey: null,
    backgroundKey: null,
    backgroundStory: null,
    ...overrides
  }
}

describe('characterSetupDraft', () => {
  it('rebuilds a draft from an equipment-phase player', () => {
    const draft = resolveCharacterSetupDraft([player()])
    expect(draft).toEqual({
      playerCharacterId: 'p1',
      name: 'Kael',
      archetype: 'fighter',
      alignment: 'lawful_good',
      abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 },
      abilityScoreMethod: 'pointBuy',
      portraitPath: '/portrait.png',
      sheetBackgroundPath: null
    })
  })

  it('rebuilds a draft from a race-phase player', () => {
    const draft = resolveCharacterSetupDraft([player({ guidedCreationPhase: 'race' })])
    expect(draft?.playerCharacterId).toBe('p1')
    expect(draft?.name).toBe('Kael')
  })

  it('rebuilds a draft from a background-phase player', () => {
    const draft = resolveCharacterSetupDraft([player({ guidedCreationPhase: 'background', raceKey: 'elf' })])
    expect(draft).toEqual({
      playerCharacterId: 'p1',
      name: 'Kael',
      archetype: 'fighter',
      alignment: 'lawful_good',
      abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 },
      abilityScoreMethod: 'pointBuy',
      portraitPath: '/portrait.png',
      sheetBackgroundPath: null
    })
  })

  it('returns null when no race- or equipment-phase player exists', () => {
    expect(resolveCharacterSetupDraft([player({ guidedCreationPhase: 'identity' })])).toBeNull()
  })

  it('returns null when ability scores are missing from stats', () => {
    expect(buildCharacterSetupDraft(player({ stats: { ac: 10 } }), [player()])).toBeNull()
  })
})

describe('characterSetupDraft ability score method', () => {
  it('restores a stored ability score method', () => {
    const draft = buildCharacterSetupDraft(
      player({
        stats: {
          abilityScores: { body: 16, agility: 14, mind: 15, presence: 13 },
          abilityScoreMethod: 'roll',
          ac: 12,
          maxHp: 14,
          hitDieRolls: [10]
        }
      }),
      [player()]
    )
    expect(draft?.abilityScoreMethod).toBe('roll')
  })

  it('infers roll for legacy characters with out-of-range scores', () => {
    const draft = buildCharacterSetupDraft(
      player({
        stats: {
          abilityScores: { body: 16, agility: 14, mind: 15, presence: 13 },
          ac: 12,
          maxHp: 14,
          hitDieRolls: [10]
        }
      }),
      [player()]
    )
    expect(draft?.abilityScoreMethod).toBe('roll')
  })
})
