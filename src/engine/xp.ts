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
  levelsGained: number
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
  const levelsGained = Math.max(0, level - state.level)
  return { state: { xp, level }, leveledUp: levelsGained > 0, levelsGained }
}

export function xpThresholdForLevel(level: number): number {
  const index = Math.max(0, Math.min(level - 1, LEVEL_XP_THRESHOLDS.length - 1))
  return LEVEL_XP_THRESHOLDS[index] ?? 0
}

export interface LevelXpRange {
  level: number
  minXp: number
  xpToNext: number | null
}

export interface XpProgress {
  level: number
  totalXp: number
  levelFloorXp: number
  nextLevelThreshold: number | null
  xpIntoLevel: number
  xpNeededForNext: number | null
  progressRatio: number
  isMaxLevel: boolean
}

export function listLevelXpRanges(): LevelXpRange[] {
  return LEVEL_XP_THRESHOLDS.map((minXp, index) => {
    const level = index + 1
    const nextMin = LEVEL_XP_THRESHOLDS[index + 1]
    return {
      level,
      minXp,
      xpToNext: nextMin === undefined ? null : nextMin - minXp
    }
  })
}

export function resolveXpProgress(xp: number): XpProgress {
  const level = levelForXP(xp)
  const levelFloorXp = xpThresholdForLevel(level)
  const isMaxLevel = level >= MAX_LEVEL
  const nextLevelThreshold = isMaxLevel ? null : xpThresholdForLevel(level + 1)
  const xpIntoLevel = xp - levelFloorXp
  const span = nextLevelThreshold === null ? null : nextLevelThreshold - levelFloorXp
  const progressRatio =
    isMaxLevel || span === null || span <= 0 ? 1 : Math.min(1, Math.max(0, xpIntoLevel / span))

  return {
    level,
    totalXp: xp,
    levelFloorXp,
    nextLevelThreshold,
    xpIntoLevel,
    xpNeededForNext: span,
    progressRatio,
    isMaxLevel
  }
}
