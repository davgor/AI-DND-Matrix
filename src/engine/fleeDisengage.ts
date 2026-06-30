import { abilityModifier, type RandomFn } from './abilities'
import { rollD20 } from './checks'

export interface FleeDisengageParams {
  rng: RandomFn
  playerAgilityScore: number
  playerProficient: boolean
  proficiencyBonus: number
  hostileAgilityScore: number
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
  const playerRoll = rollD20(params.rng)
  const hostileRoll = rollD20(params.rng)
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
