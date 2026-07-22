export type LockoutStats = {
  actionLockoutTurnsRemaining?: number
}

function normalizeLockoutTurns(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, Math.floor(value))
}

export function applyTurnLockout<T extends LockoutStats>(stats: T, costTurns: number): T {
  return {
    ...stats,
    actionLockoutTurnsRemaining: normalizeLockoutTurns(costTurns)
  }
}

export function tickTurnLockout<T extends LockoutStats>(stats: T): T {
  const remaining = normalizeLockoutTurns(stats.actionLockoutTurnsRemaining ?? 0)
  return {
    ...stats,
    actionLockoutTurnsRemaining: Math.max(0, remaining - 1)
  }
}

export function isActionLocked(stats: LockoutStats): boolean {
  return normalizeLockoutTurns(stats.actionLockoutTurnsRemaining ?? 0) > 0
}

export function canTakeMovementWhileLocked(_stats?: LockoutStats): boolean {
  return true
}

/** Catalog cost only — ignore any LLM-proposed duration. */
export function resolveLockoutCostFromCatalog(
  catalogCost: number,
  _proposedDuration?: number
): number {
  return normalizeLockoutTurns(catalogCost)
}
