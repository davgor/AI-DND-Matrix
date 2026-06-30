import { describe, expect, it } from 'vitest'
import { shouldTriggerQuestLoot, inferQuestScale } from './questLootContext'

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

describe('inferQuestScale', () => {
  it('returns minor for plain short hooks', () => {
    expect(
      inferQuestScale({
        id: 'x',
        campaignId: 'c',
        title: 'Village Trouble',
        state: 'completed',
        summary: 'Short summary.'
      })
    ).toBe('minor')
  })

  it('returns major for long summaries or major keywords', () => {
    expect(
      inferQuestScale({
        id: 'x',
        campaignId: 'c',
        title: 'Village Trouble',
        state: 'completed',
        summary: 'a'.repeat(201)
      })
    ).toBe('major')
    expect(
      inferQuestScale({
        id: 'x',
        campaignId: 'c',
        title: 'The Main Quest',
        state: 'completed',
        summary: 'Short.'
      })
    ).toBe('major')
    expect(
      inferQuestScale({
        id: 'x',
        campaignId: 'c',
        title: 'Stop the Ritual',
        state: 'completed',
        summary: 'Short.'
      })
    ).toBe('major')
  })
})
