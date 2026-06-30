import { describe, expect, it } from 'vitest'
import {
  isCatalogMonsterHpInput,
  isHitDieRollLog,
  isRetiredAdventurerStatProfile,
  parseCharacterHpStats,
  hasAuthoritativeMaxHp
} from './types'

describe('parseCharacterHpStats', () => {
  it('parses maxHp and hitDieRolls from character stats JSON', () => {
    const parsed = parseCharacterHpStats({
      maxHp: 12,
      hitDieRolls: [8],
      abilityScores: { body: 14, agility: 12, mind: 10, presence: 10 }
    })
    expect(parsed?.maxHp).toBe(12)
    expect(parsed?.hitDieRolls).toEqual([8])
    expect(hasAuthoritativeMaxHp(parsed)).toBe(true)
  })

  it('returns undefined for empty stats', () => {
    expect(parseCharacterHpStats({})).toBeUndefined()
  })
})

describe('type guards', () => {
  it('validates HitDieRollLog', () => {
    expect(
      isHitDieRollLog({ rolls: [6, 4], bodyModifier: 2, maxHp: 12 })
    ).toBe(true)
    expect(isHitDieRollLog({ rolls: 'bad' })).toBe(false)
  })

  it('validates RetiredAdventurerStatProfile', () => {
    expect(isRetiredAdventurerStatProfile({ archetype: 'fighter', level: 3, bodyScore: 16 })).toBe(true)
    expect(isRetiredAdventurerStatProfile({ archetype: 'bard', level: 3, bodyScore: 16 })).toBe(false)
  })

  it('validates CatalogMonsterHpInput', () => {
    expect(
      isCatalogMonsterHpInput({
        archetype: 'rogue',
        level: 2,
        bodyScore: 8,
        npcId: 'n1',
        catalogKey: 'goblin-scout'
      })
    ).toBe(true)
  })
})
