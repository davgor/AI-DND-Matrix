import type { Ability } from './abilities'
import type { AdvantageMode } from './checks'

export type Condition = 'prone' | 'stunned' | 'poisoned' | 'restrained' | 'unconscious'

export const CONDITIONS: readonly Condition[] = [
  'prone',
  'stunned',
  'poisoned',
  'restrained',
  'unconscious'
] as const

export interface ConditionEffect {
  disadvantageOn?: Ability[]
  disadvantageOnAll?: boolean
  preventsActions?: boolean
  autoFailSaves?: Ability[]
}

export const CONDITION_EFFECTS: Record<Condition, ConditionEffect> = {
  prone: { disadvantageOn: ['agility'] },
  stunned: { preventsActions: true, autoFailSaves: ['body', 'agility'] },
  poisoned: { disadvantageOnAll: true },
  restrained: { disadvantageOn: ['agility'] },
  unconscious: { preventsActions: true, autoFailSaves: ['body', 'agility'] }
}

export function isCondition(value: unknown): value is Condition {
  return typeof value === 'string' && (CONDITIONS as readonly string[]).includes(value)
}

export function parseConditions(raw: unknown): Condition[] {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.filter(isCondition)
}

export function conditionsFromStats(stats: unknown): Condition[] {
  if (!stats || typeof stats !== 'object') {
    return []
  }
  return parseConditions((stats as { conditions?: unknown }).conditions)
}

export function canAct(conditions: Condition[]): boolean {
  return !conditions.some((condition) => CONDITION_EFFECTS[condition].preventsActions)
}

export function hasDisadvantageOn(conditions: Condition[], ability: Ability): boolean {
  return conditions.some((condition) => {
    const effect = CONDITION_EFFECTS[condition]
    if (effect.disadvantageOnAll) {
      return true
    }
    return effect.disadvantageOn?.includes(ability) ?? false
  })
}

export function autoFailsSave(conditions: Condition[], ability: Ability): boolean {
  return conditions.some(
    (condition) => CONDITION_EFFECTS[condition].autoFailSaves?.includes(ability) ?? false
  )
}

export function advantageModeFromConditions(
  conditions: Condition[],
  ability: Ability
): AdvantageMode {
  return hasDisadvantageOn(conditions, ability) ? 'disadvantage' : 'none'
}

/** Weapon / combat attack rolls use Agility for condition disadvantage. */
export function attackAdvantageMode(conditions: Condition[]): AdvantageMode {
  return advantageModeFromConditions(conditions, 'agility')
}
