import { abilityModifier, type RandomFn } from './abilities'
import { rollD20WithMode } from './checks'
import { advantageModeFromConditions, type Condition } from './conditions'

export interface FleeDisengageParams {
  rng: RandomFn
  playerAgilityScore: number
  playerProficient: boolean
  proficiencyBonus: number
  hostileAgilityScore: number
  playerConditions?: Condition[]
  hostileConditions?: Condition[]
}

export interface FleeAttemptResult {
  playerRoll: number
  playerTotal: number
  hostileRoll: number
  hostileTotal: number
  success: boolean
  margin: number
}

/** Opposed Agility disengage — flat contested roll, no crit rules. Ties favor the defender (hostile). */
export function resolveFleeDisengage(params: FleeDisengageParams): FleeAttemptResult {
  const playerRoll = rollD20WithMode(
    params.rng,
    advantageModeFromConditions(params.playerConditions ?? [], 'agility')
  )
  const hostileRoll = rollD20WithMode(
    params.rng,
    advantageModeFromConditions(params.hostileConditions ?? [], 'agility')
  )
  const playerBonus =
    abilityModifier(params.playerAgilityScore) +
    (params.playerProficient ? params.proficiencyBonus : 0)
  const hostileBonus = abilityModifier(params.hostileAgilityScore)
  const playerTotal = playerRoll + playerBonus
  const hostileTotal = hostileRoll + hostileBonus
  const success = playerTotal > hostileTotal
  return {
    playerRoll,
    playerTotal,
    hostileRoll,
    hostileTotal,
    success,
    margin: playerTotal - hostileTotal
  }
}
