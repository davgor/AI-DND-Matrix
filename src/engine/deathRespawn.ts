export interface RespawnRules {
  location: string
  cost: number
  limit?: number
}

export interface RespawnState {
  currency: number
  remainingUses?: number
}

export type RespawnOutcome =
  | { mode: 'respawn'; location: string; currency: number; remainingUses?: number }
  | { mode: 'legendary' }

export function resolveRespawnDeath(rules: RespawnRules, state: RespawnState): RespawnOutcome {
  if (rules.limit === undefined) {
    return { mode: 'respawn', location: rules.location, currency: state.currency - rules.cost }
  }

  const remaining = state.remainingUses ?? rules.limit
  if (remaining <= 0) {
    return { mode: 'legendary' }
  }

  return {
    mode: 'respawn',
    location: rules.location,
    currency: state.currency - rules.cost,
    remainingUses: remaining - 1
  }
}
