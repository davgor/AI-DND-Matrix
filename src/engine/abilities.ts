export type Ability = 'body' | 'agility' | 'mind' | 'presence'

export type AbilityScores = Record<Ability, number>

export type RandomFn = () => number

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export const POINT_BUY_POOL = 27
export const POINT_BUY_MIN = 8
export const POINT_BUY_MAX = 15

export type PointBuyResult =
  | { valid: true; scores: AbilityScores }
  | { valid: false; reason: string }

function pointBuyCost(score: number): number {
  return score - POINT_BUY_MIN
}

export function resolvePointBuy(allocation: AbilityScores): PointBuyResult {
  const scores = Object.values(allocation)
  const outOfRange = scores.find((score) => score < POINT_BUY_MIN || score > POINT_BUY_MAX)
  if (outOfRange !== undefined) {
    return {
      valid: false,
      reason: `score ${outOfRange} is outside the ${POINT_BUY_MIN}-${POINT_BUY_MAX} range`
    }
  }

  const totalCost = scores.reduce((sum, score) => sum + pointBuyCost(score), 0)
  if (totalCost > POINT_BUY_POOL) {
    return {
      valid: false,
      reason: `allocation costs ${totalCost} points, exceeding the pool of ${POINT_BUY_POOL}`
    }
  }

  return { valid: true, scores: allocation }
}

export const STANDARD_ARRAY = [15, 14, 13, 12] as const

export type StandardArrayResult =
  | { valid: true; scores: AbilityScores }
  | { valid: false; reason: string }

export function resolveStandardArray(assignment: AbilityScores): StandardArrayResult {
  const assigned = Object.values(assignment).sort((a, b) => a - b)
  const expected = [...STANDARD_ARRAY].sort((a, b) => a - b)
  const matches =
    assigned.length === expected.length && assigned.every((value, index) => value === expected[index])

  if (!matches) {
    return { valid: false, reason: 'assignment must use each standard array value exactly once' }
  }

  return { valid: true, scores: assignment }
}

export function createSeededRandom(seed: number): RandomFn {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function rollDie(rng: RandomFn, sides: number): number {
  return Math.floor(rng() * sides) + 1
}

function roll4d6DropLowest(rng: RandomFn): number {
  const rolls = [rollDie(rng, 6), rollDie(rng, 6), rollDie(rng, 6), rollDie(rng, 6)].sort((a, b) => a - b)
  return rolls[1] + rolls[2] + rolls[3]
}

export function rollForStats(rng: RandomFn): AbilityScores {
  return {
    body: roll4d6DropLowest(rng),
    agility: roll4d6DropLowest(rng),
    mind: roll4d6DropLowest(rng),
    presence: roll4d6DropLowest(rng)
  }
}
