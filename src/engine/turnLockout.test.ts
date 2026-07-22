import { describe, expect, it } from 'vitest'
import {
  applyTurnLockout,
  canTakeMovementWhileLocked,
  isActionLocked,
  resolveLockoutCostFromCatalog,
  tickTurnLockout,
  type LockoutStats
} from './turnLockout'

const EMPTY_LOCKOUT: LockoutStats = {}

describe('applyTurnLockout', () => {
  it('sets remaining to catalog cost N', () => {
    const next = applyTurnLockout(EMPTY_LOCKOUT, 2)
    expect(next.actionLockoutTurnsRemaining).toBe(2)
    expect(isActionLocked(next)).toBe(true)
  })

  it('floors non-integer and clamps negative to 0', () => {
    expect(applyTurnLockout(EMPTY_LOCKOUT, 1.9).actionLockoutTurnsRemaining).toBe(1)
    expect(applyTurnLockout(EMPTY_LOCKOUT, -3).actionLockoutTurnsRemaining).toBe(0)
    expect(isActionLocked(applyTurnLockout(EMPTY_LOCKOUT, -3))).toBe(false)
  })
})

describe('tickTurnLockout', () => {
  it('clears after N ticks for cost N', () => {
    let stats = applyTurnLockout(EMPTY_LOCKOUT, 2)
    stats = tickTurnLockout(stats)
    expect(stats.actionLockoutTurnsRemaining).toBe(1)
    expect(isActionLocked(stats)).toBe(true)
    stats = tickTurnLockout(stats)
    expect(stats.actionLockoutTurnsRemaining).toBe(0)
    expect(isActionLocked(stats)).toBe(false)
  })

  it('stays at 0 when already clear', () => {
    expect(tickTurnLockout(EMPTY_LOCKOUT).actionLockoutTurnsRemaining).toBe(0)
    expect(tickTurnLockout({ actionLockoutTurnsRemaining: 0 }).actionLockoutTurnsRemaining).toBe(0)
  })
})

describe('movement policy', () => {
  it('allows movement while locked', () => {
    expect(canTakeMovementWhileLocked()).toBe(true)
    expect(canTakeMovementWhileLocked(applyTurnLockout(EMPTY_LOCKOUT, 3))).toBe(true)
  })
})

describe('resolveLockoutCostFromCatalog', () => {
  it('uses catalog cost and ignores LLM proposed duration', () => {
    expect(resolveLockoutCostFromCatalog(1, 99)).toBe(1)
    expect(resolveLockoutCostFromCatalog(3, undefined)).toBe(3)
    expect(resolveLockoutCostFromCatalog(-1, 5)).toBe(0)
  })
})
