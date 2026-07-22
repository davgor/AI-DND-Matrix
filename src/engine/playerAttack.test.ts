import { describe, expect, it } from 'vitest'
import { resolvePlayerAttackAgainstNpc } from './playerAttack'
import type { DamageComponent } from '../shared/weaponModifications/types'

const weaponComponents: DamageComponent[] = [
  { damageRoll: { diceCount: 1, diceSize: 8, modifier: 3 }, damageType: 'physical' }
]

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

describe('resolvePlayerAttackAgainstNpc basic hits', () => {
  it('misses below AC', () => {
    const result = resolvePlayerAttackAgainstNpc({
      rng: fixedRng(10),
      attackModifier: 2,
      weaponComponents,
      targetAc: 15,
      targetHp: 10
    })
    expect(result.hit).toBe(false)
    expect(result.damage).toBe(0)
    expect(result.targetHpAfter).toBe(10)
  })

  it('hits and applies damage', () => {
    const result = resolvePlayerAttackAgainstNpc({
      rng: fixedRng(15),
      attackModifier: 3,
      weaponComponents,
      targetAc: 12,
      targetHp: 10
    })
    expect(result.hit).toBe(true)
    expect(result.damage).toBeGreaterThan(0)
    expect(result.targetHpAfter).toBeLessThan(10)
  })

  it('natural 1 always misses', () => {
    const result = resolvePlayerAttackAgainstNpc({
      rng: fixedRng(1),
      attackModifier: 10,
      weaponComponents,
      targetAc: 5,
      targetHp: 10
    })
    expect(result.hit).toBe(false)
    expect(result.attackRoll).toBe(1)
  })
})

describe('resolvePlayerAttackAgainstNpc crits and resistances', () => {
  it('natural 20 crits and doubles dice', () => {
    const normal = resolvePlayerAttackAgainstNpc({
      rng: fixedRng(15),
      attackModifier: 0,
      weaponComponents: [{ damageRoll: { diceCount: 1, diceSize: 6, modifier: 0 }, damageType: 'physical' }],
      targetAc: 10,
      targetHp: 20
    })
    const crit = resolvePlayerAttackAgainstNpc({
      rng: fixedRng(20),
      attackModifier: 0,
      weaponComponents: [{ damageRoll: { diceCount: 1, diceSize: 6, modifier: 0 }, damageType: 'physical' }],
      targetAc: 10,
      targetHp: 20
    })
    expect(crit.crit).toBe(true)
    expect(crit.hit).toBe(true)
    expect(crit.damage).toBeGreaterThan(normal.damage)
  })

  it('halves fire component when target resists fire', () => {
    const result = resolvePlayerAttackAgainstNpc({
      rng: fixedRng(18),
      attackModifier: 2,
      weaponComponents: [
        { damageRoll: { diceCount: 1, diceSize: 8, modifier: 0 }, damageType: 'physical' },
        { damageRoll: { diceCount: 1, diceSize: 6, modifier: 0 }, damageType: 'fire' }
      ],
      targetAc: 10,
      targetHp: 30,
      targetResistances: { fire: 'resistant' }
    })
    expect(result.hit).toBe(true)
    expect(result.damageBreakdown.components).toHaveLength(2)
    expect(result.damageBreakdown.components[1]?.afterResistance).toBeLessThan(
      result.damageBreakdown.components[1]?.rolled ?? 0
    )
  })

  it('marks defeated at 0 HP', () => {
    const result = resolvePlayerAttackAgainstNpc({
      rng: fixedRng(20),
      attackModifier: 5,
      weaponComponents: [{ damageRoll: { diceCount: 4, diceSize: 8, modifier: 0 }, damageType: 'physical' }],
      targetAc: 10,
      targetHp: 4
    })
    expect(result.targetDefeated).toBe(true)
    expect(result.targetHpAfter).toBe(0)
  })
})

describe('resolvePlayerAttackAgainstNpc lethality defaults', () => {
  it('defaults lethality to lethal and sets wouldKill at 0 HP', () => {
    const result = resolvePlayerAttackAgainstNpc({
      rng: fixedRng(20),
      attackModifier: 5,
      weaponComponents: [{ damageRoll: { diceCount: 4, diceSize: 8, modifier: 0 }, damageType: 'physical' }],
      targetAc: 10,
      targetHp: 4
    })
    expect(result.lethality).toBe('lethal')
    expect(result.wouldKill).toBe(true)
    expect(result.incapacitated).toBe(false)
  })
})

describe('resolvePlayerAttackAgainstNpc condition disadvantage', () => {
  function sequenceRng(rolls: number[]) {
    let i = 0
    return () => {
      const roll = rolls[i] ?? 10
      i += 1
      return (roll - 1) / 20
    }
  }

  it('poisoned attacker takes the lower of two d20 rolls (disadvantage)', () => {
    const result = resolvePlayerAttackAgainstNpc({
      rng: sequenceRng([18, 5]),
      attackModifier: 2,
      weaponComponents,
      targetAc: 15,
      targetHp: 10,
      attackerConditions: ['poisoned']
    })
    expect(result.attackRoll).toBe(5)
    expect(result.hit).toBe(false)
  })

  it('prone attacker has disadvantage on the attack roll', () => {
    const result = resolvePlayerAttackAgainstNpc({
      rng: sequenceRng([19, 4]),
      attackModifier: 0,
      weaponComponents,
      targetAc: 10,
      targetHp: 10,
      attackerConditions: ['prone']
    })
    expect(result.attackRoll).toBe(4)
    expect(result.hit).toBe(false)
  })
})

describe('resolvePlayerAttackAgainstNpc non-lethal attacks', () => {
  it('non-lethal at 0 HP sets incapacitated, not wouldKill', () => {
    const result = resolvePlayerAttackAgainstNpc({
      rng: fixedRng(20),
      attackModifier: 5,
      weaponComponents: [{ damageRoll: { diceCount: 4, diceSize: 8, modifier: 0 }, damageType: 'physical' }],
      targetAc: 10,
      targetHp: 4,
      lethality: 'non_lethal'
    })
    expect(result.lethality).toBe('non_lethal')
    expect(result.incapacitated).toBe(true)
    expect(result.wouldKill).toBe(false)
    expect(result.targetDefeated).toBe(true)
  })

  it('non-lethal crit incapacitates rather than auto-slays', () => {
    const result = resolvePlayerAttackAgainstNpc({
      rng: fixedRng(20),
      attackModifier: 0,
      weaponComponents: [{ damageRoll: { diceCount: 1, diceSize: 6, modifier: 0 }, damageType: 'physical' }],
      targetAc: 10,
      targetHp: 1,
      lethality: 'non_lethal'
    })
    expect(result.crit).toBe(true)
    expect(result.incapacitated).toBe(true)
    expect(result.wouldKill).toBe(false)
  })

  it('miss returns lethality in result without kill flags', () => {
    const result = resolvePlayerAttackAgainstNpc({
      rng: fixedRng(1),
      attackModifier: 10,
      weaponComponents,
      targetAc: 5,
      targetHp: 10,
      lethality: 'non_lethal'
    })
    expect(result.hit).toBe(false)
    expect(result.lethality).toBe('non_lethal')
    expect(result.incapacitated).toBe(false)
    expect(result.wouldKill).toBe(false)
  })
})
