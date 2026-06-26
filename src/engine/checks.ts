import { abilityModifier, type RandomFn } from './abilities'

export type AdvantageMode = 'advantage' | 'disadvantage' | 'none'

export interface CheckParams {
  rng: RandomFn
  abilityScore: number
  proficient: boolean
  proficiencyBonus: number
  dc: number
  mode?: AdvantageMode
}

export interface CheckResult {
  roll: number
  total: number
  success: boolean
}

export function rollD20(rng: RandomFn): number {
  return Math.floor(rng() * 20) + 1
}

export function rollD20WithMode(rng: RandomFn, mode: AdvantageMode): number {
  if (mode === 'none') {
    return rollD20(rng)
  }
  const first = rollD20(rng)
  const second = rollD20(rng)
  return mode === 'advantage' ? Math.max(first, second) : Math.min(first, second)
}

export function resolveCheck(params: CheckParams): CheckResult {
  const roll = rollD20WithMode(params.rng, params.mode ?? 'none')
  const bonus = abilityModifier(params.abilityScore) + (params.proficient ? params.proficiencyBonus : 0)
  const total = roll + bonus
  return { roll, total, success: total >= params.dc }
}
