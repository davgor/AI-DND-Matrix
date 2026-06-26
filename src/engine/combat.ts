import { abilityModifier, type RandomFn } from './abilities'
import { rollD20 } from './checks'

export interface Combatant {
  id: string
  agilityScore: number
}

export interface InitiativeEntry {
  id: string
  roll: number
}

export function rollInitiative(combatants: Combatant[], rng: RandomFn): InitiativeEntry[] {
  const entries = combatants.map((combatant) => ({
    id: combatant.id,
    roll: rollD20(rng) + abilityModifier(combatant.agilityScore)
  }))
  return entries.sort((a, b) => b.roll - a.roll)
}

export interface TurnState {
  actionTaken: boolean
}

export function startTurn(): TurnState {
  return { actionTaken: false }
}

export function useAction(state: TurnState): TurnState {
  if (state.actionTaken) {
    throw new Error('only one Action allowed per turn')
  }
  return { actionTaken: true }
}
