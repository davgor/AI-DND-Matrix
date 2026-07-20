import { describe, expect, it } from 'vitest'
import { inferAbilityScoreMethod, resolveAbilityScoreMethod } from './abilityScoreMethod'

describe('abilityScoreMethod', () => {
  it('infers roll when scores exceed point buy limits', () => {
    expect(inferAbilityScoreMethod({ body: 16, agility: 14, mind: 15, presence: 13 })).toBe('roll')
  })

  it('infers standard array when scores match the array', () => {
    expect(inferAbilityScoreMethod({ body: 14, agility: 12, mind: 10, presence: 8 })).toBe('standardArray')
  })

  it('prefers a stored method over inference', () => {
    const scores = { body: 14, agility: 12, mind: 10, presence: 8 }
    expect(resolveAbilityScoreMethod({ abilityScoreMethod: 'roll' }, scores)).toBe('roll')
  })
})
