import { describe, expect, it } from 'vitest'
import { inferQuestScale, inferQuestScaleFromTitleSummary } from '../engine/quests'
import { shouldTriggerQuestLoot } from './questLootContext'

describe('shouldTriggerQuestLoot', () => {
  it('returns true when transitioning from active to a completed state', () => {
    expect(shouldTriggerQuestLoot('active', 'completed')).toBe(true)
    expect(shouldTriggerQuestLoot('active', 'resolved')).toBe(true)
    expect(shouldTriggerQuestLoot('active', 'done')).toBe(true)
  })

  it('returns false without a fresh completion transition', () => {
    expect(shouldTriggerQuestLoot('completed', 'completed')).toBe(false)
    expect(shouldTriggerQuestLoot('active', 'in_progress')).toBe(false)
    expect(shouldTriggerQuestLoot('resolved', 'done')).toBe(false)
  })
})

describe('inferQuestScaleFromTitleSummary', () => {
  it('returns minor for plain short hooks', () => {
    expect(inferQuestScaleFromTitleSummary('Village Trouble', 'Short summary.')).toBe('minor')
  })

  it('returns major for long summaries or major keywords', () => {
    expect(inferQuestScaleFromTitleSummary('Village Trouble', 'a'.repeat(201))).toBe('major')
    expect(inferQuestScaleFromTitleSummary('The Main Quest', 'Short.')).toBe('major')
    expect(inferQuestScaleFromTitleSummary('Stop the Ritual', 'Short.')).toBe('major')
  })
})

describe('quest scale semantics by path', () => {
  it('uses kind=main for quest records and title heuristics for story threads', () => {
    expect(inferQuestScale({ kind: 'main', title: 'Herb run', summary: 'Short.' })).toBe('major')
    expect(inferQuestScaleFromTitleSummary('Herb run', 'Short.')).toBe('minor')
  })
})
