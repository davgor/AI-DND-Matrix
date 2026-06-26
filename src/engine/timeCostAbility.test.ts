import { describe, expect, it } from 'vitest'
import {
  advanceLockout,
  applyLockout,
  canTakeAction,
  resolveTimeCostAbility,
  type TimeCostAbility
} from './timeCostAbility'

describe('resolveTimeCostAbility', () => {
  it('resolves the base effect immediately with zero extra turns', () => {
    const ability: TimeCostAbility = { baseEffect: 10, bonusPerTurn: 4 }
    expect(resolveTimeCostAbility(ability, 0)).toEqual({ effect: 10, lockoutTurns: 0 })
  })

  it('scales formulaically and consistently across different base abilities', () => {
    const fireball: TimeCostAbility = { baseEffect: 10, bonusPerTurn: 4 }
    const heal: TimeCostAbility = { baseEffect: 6, bonusPerTurn: 2 }

    expect(resolveTimeCostAbility(fireball, 2)).toEqual({ effect: 18, lockoutTurns: 2 })
    expect(resolveTimeCostAbility(heal, 2)).toEqual({ effect: 10, lockoutTurns: 2 })
  })

  it('rejects negative extra turns', () => {
    expect(() => resolveTimeCostAbility({ baseEffect: 5, bonusPerTurn: 1 }, -1)).toThrow()
  })
})

describe('ability lockout', () => {
  it('locks out Actions for exactly N subsequent turns', () => {
    let lockout = applyLockout(2)
    expect(canTakeAction(lockout)).toBe(false)
    lockout = advanceLockout(lockout)
    expect(canTakeAction(lockout)).toBe(false)
    lockout = advanceLockout(lockout)
    expect(canTakeAction(lockout)).toBe(true)
  })
})
