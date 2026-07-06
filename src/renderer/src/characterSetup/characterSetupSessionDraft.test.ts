import { describe, expect, it } from 'vitest'
import { resolveCharacterSetupFormDefaults } from './characterSetupSessionDraft'

describe('resolveCharacterSetupFormDefaults', () => {
  it('prefers a database draft over a session draft', () => {
    const resolved = resolveCharacterSetupFormDefaults(
      {
        name: 'Kael',
        archetype: 'fighter',
        alignment: 'lawful_good',
        abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 },
        abilityScoreMethod: 'roll'
      },
      {
        name: 'Draft',
        archetype: 'mage',
        alignment: 'chaotic_neutral',
        abilityScores: { body: 8, agility: 8, mind: 8, presence: 8 },
        abilityScoreMethod: 'pointBuy'
      }
    )

    expect(resolved.abilityScoreMethod).toBe('roll')
    expect(resolved.name).toBe('Kael')
  })

  it('falls back to a session draft when no database draft exists', () => {
    const resolved = resolveCharacterSetupFormDefaults(null, {
      name: 'Draft',
      archetype: 'mage',
      alignment: 'chaotic_neutral',
      abilityScores: { body: 15, agility: 14, mind: 13, presence: 12 },
      abilityScoreMethod: 'standardArray'
    })

    expect(resolved).toEqual({
      name: 'Draft',
      archetype: 'mage',
      alignment: 'chaotic_neutral',
      abilityScores: { body: 15, agility: 14, mind: 13, presence: 12 },
      abilityScoreMethod: 'standardArray'
    })
  })
})
