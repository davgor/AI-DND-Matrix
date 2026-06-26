export const LEVEL_XP_THRESHOLDS: readonly number[] = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000,
  165000, 195000, 225000, 265000, 305000, 355000
]

export const MAX_LEVEL = LEVEL_XP_THRESHOLDS.length

export interface XPState {
  xp: number
  level: number
}

export interface XPAwardResult {
  state: XPState
  leveledUp: boolean
}

function levelForXP(xp: number): number {
  let level = 1
  for (let index = LEVEL_XP_THRESHOLDS.length - 1; index >= 0; index--) {
    if (xp >= LEVEL_XP_THRESHOLDS[index]) {
      level = index + 1
      break
    }
  }
  return Math.min(level, MAX_LEVEL)
}

export function awardXP(state: XPState, amount: number): XPAwardResult {
  const xp = state.xp + amount
  const level = levelForXP(xp)
  return { state: { xp, level }, leveledUp: level > state.level }
}
