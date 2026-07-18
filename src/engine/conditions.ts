import type { Ability } from './abilities'

export type Condition = 'prone' | 'stunned' | 'poisoned' | 'restrained' | 'unconscious'

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

export function canAct(conditions: Condition[]): boolean {
  return !conditions.some((condition) => CONDITION_EFFECTS[condition].preventsActions)
}
