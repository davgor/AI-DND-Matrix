import type { Ability } from './abilities'
import { resolveCheck, type CheckParams, type CheckResult } from './checks'
import { advantageModeFromConditions, autoFailsSave, type Condition } from './conditions'

export interface SaveParams extends CheckParams {
  ability: Ability
  /** When set, applies auto-fail and disadvantage from CONDITION_EFFECTS. */
  conditions?: Condition[]
}

export function resolveSave(params: SaveParams): CheckResult {
  const conditions = params.conditions ?? []
  if (autoFailsSave(conditions, params.ability)) {
    return { roll: 1, total: 1, success: false }
  }
  const mode = params.mode ?? advantageModeFromConditions(conditions, params.ability)
  return resolveCheck({ ...params, mode })
}
