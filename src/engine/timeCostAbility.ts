export interface TimeCostAbility {
  baseEffect: number
  bonusPerTurn: number
}

export interface TimeCostResolution {
  effect: number
  lockoutTurns: number
}

export function resolveTimeCostAbility(
  ability: TimeCostAbility,
  extraTurns: number
): TimeCostResolution {
  if (extraTurns < 0) {
    throw new Error('extraTurns must be non-negative')
  }
  return {
    effect: ability.baseEffect + ability.bonusPerTurn * extraTurns,
    lockoutTurns: extraTurns
  }
}

export interface LockoutState {
  turnsRemaining: number
}

export function applyLockout(turns: number): LockoutState {
  return { turnsRemaining: turns }
}

export function canTakeAction(lockout: LockoutState): boolean {
  return lockout.turnsRemaining <= 0
}

export function advanceLockout(lockout: LockoutState): LockoutState {
  return { turnsRemaining: Math.max(0, lockout.turnsRemaining - 1) }
}
