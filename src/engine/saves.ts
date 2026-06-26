import type { Ability } from './abilities'
import { resolveCheck, type CheckParams, type CheckResult } from './checks'

export interface SaveParams extends CheckParams {
  ability: Ability
}

export function resolveSave(params: SaveParams): CheckResult {
  return resolveCheck(params)
}
