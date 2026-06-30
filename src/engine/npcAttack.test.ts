import { describe, expect, it } from 'vitest'
import { resolveNpcAttack } from './npcAttack'

function fixedRng(roll: number) {
  let calls = 0
  return () => {
    calls += 1
    if (calls === 1) {
      return (roll - 1) / 20
    }
    return 0.5
  }
}

describe('resolveNpcAttack', () => {
  const damageRoll = { diceCount: 1, diceSize: 6, modifier: 0 }

  it('misses below target AC', () => {
    const result = resolveNpcAttack({
      rng: fixedRng(5),
      attackBonus: 2,
      damageRoll,
      targetAc: 15,
      targetHp: 20
    })
    expect(result.hit).toBe(false)
    expect(result.damage).toBe(0)
  })

  it('hits using persisted attack bonus and damage', () => {
    const result = resolveNpcAttack({
      rng: fixedRng(18),
      attackBonus: 4,
      damageRoll,
      targetAc: 12,
      targetHp: 20
    })
    expect(result.hit).toBe(true)
    expect(result.damage).toBeGreaterThan(0)
    expect(result.targetHpAfter).toBeLessThan(20)
  })
})
