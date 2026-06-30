import { describe, expect, it } from 'vitest'
import { isLootCompletedState, isQuestScale, isLootSource } from './types'

describe('loot shared type guards', () => {
  it('isLootCompletedState accepts valid states', () => {
    expect(isLootCompletedState('completed')).toBe(true)
    expect(isLootCompletedState('resolved')).toBe(true)
    expect(isLootCompletedState('done')).toBe(true)
  })

  it('isLootCompletedState rejects non-terminal states', () => {
    expect(isLootCompletedState('active')).toBe(false)
    expect(isLootCompletedState('open')).toBe(false)
    expect(isLootCompletedState('')).toBe(false)
  })

  it('isQuestScale accepts minor and major', () => {
    expect(isQuestScale('minor')).toBe(true)
    expect(isQuestScale('major')).toBe(true)
    expect(isQuestScale('epic')).toBe(false)
    expect(isQuestScale(42)).toBe(false)
  })

  it('isLootSource accepts valid sources', () => {
    expect(isLootSource('encounter_end')).toBe(true)
    expect(isLootSource('quest_complete')).toBe(true)
    expect(isLootSource('random')).toBe(false)
  })
})
