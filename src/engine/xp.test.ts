import { describe, expect, it } from 'vitest'
import { awardXP, listLevelXpRanges, resolveXpProgress } from './xp'

describe('resolveXpProgress', () => {
  it('computes progress toward next level', () => {
    const progress = resolveXpProgress(150)
    expect(progress.level).toBe(1)
    expect(progress.xpIntoLevel).toBe(150)
    expect(progress.xpNeededForNext).toBe(300)
    expect(progress.progressRatio).toBeCloseTo(0.5)
  })

  it('marks max level at full progress', () => {
    const progress = resolveXpProgress(400_000)
    expect(progress.isMaxLevel).toBe(true)
    expect(progress.progressRatio).toBe(1)
    expect(progress.xpNeededForNext).toBeNull()
  })
})

describe('listLevelXpRanges', () => {
  it('lists all levels with min xp and span to next', () => {
    const ranges = listLevelXpRanges()
    expect(ranges).toHaveLength(20)
    expect(ranges[0]).toEqual({ level: 1, minXp: 0, xpToNext: 300 })
    expect(ranges[1]).toEqual({ level: 2, minXp: 300, xpToNext: 600 })
    expect(ranges[19]?.xpToNext).toBeNull()
  })
})

describe('awardXP', () => {
  it('does not level up just below a threshold', () => {
    const result = awardXP({ xp: 0, level: 1 }, 299)
    expect(result).toEqual({ state: { xp: 299, level: 1 }, leveledUp: false, levelsGained: 0 })
  })

  it('levels up exactly at a threshold', () => {
    const result = awardXP({ xp: 0, level: 1 }, 300)
    expect(result).toEqual({ state: { xp: 300, level: 2 }, leveledUp: true, levelsGained: 1 })
  })

  it('jumps directly to the highest level crossed by a large award, not just +1', () => {
    const result = awardXP({ xp: 0, level: 1 }, 6500)
    expect(result.state.level).toBe(5)
    expect(result.leveledUp).toBe(true)
    expect(result.levelsGained).toBe(4)
  })
})
