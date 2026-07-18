import { describe, expect, it } from 'vitest'
import {
  canTransitionQuestStatus,
  inferQuestScale,
  inferQuestScaleFromTitleSummary,
  isQuestRewardEligibleStatus,
  objectiveTextsToChecklist,
  storyThreadStateToQuestStatus,
  validateObjectiveUpdate
} from './quests'

describe('canTransitionQuestStatus', () => {
  it('allows available → active and active → terminal states', () => {
    expect(canTransitionQuestStatus('available', 'active')).toBe(true)
    expect(canTransitionQuestStatus('active', 'completed')).toBe(true)
    expect(canTransitionQuestStatus('active', 'failed')).toBe(true)
    expect(canTransitionQuestStatus('active', 'abandoned')).toBe(true)
    expect(canTransitionQuestStatus('available', 'abandoned')).toBe(true)
  })

  it('rejects invalid transitions', () => {
    expect(canTransitionQuestStatus('available', 'completed')).toBe(false)
    expect(canTransitionQuestStatus('completed', 'active')).toBe(false)
    expect(canTransitionQuestStatus('failed', 'active')).toBe(false)
    expect(canTransitionQuestStatus('abandoned', 'active')).toBe(false)
  })
})

describe('validateObjectiveUpdate', () => {
  const objectives = objectiveTextsToChecklist(['Find the key', 'Open the vault'])

  it('marks the objective at the given index done', () => {
    const updated = validateObjectiveUpdate(objectives, 0)
    expect(updated?.[0]?.done).toBe(true)
    expect(updated?.[1]?.done).toBe(false)
  })

  it('returns null for out-of-range index', () => {
    expect(validateObjectiveUpdate(objectives, -1)).toBeNull()
    expect(validateObjectiveUpdate(objectives, 5)).toBeNull()
  })
})

describe('isQuestRewardEligibleStatus', () => {
  it('matches loot completed semantics for quest status', () => {
    expect(isQuestRewardEligibleStatus('completed')).toBe(true)
    expect(isQuestRewardEligibleStatus('active')).toBe(false)
    expect(isQuestRewardEligibleStatus('failed')).toBe(false)
  })
})

describe('inferQuestScale', () => {
  it('marks main quests as major', () => {
    expect(
      inferQuestScale({ kind: 'main', title: 'Small errand', summary: 'Short.' })
    ).toBe('major')
  })

  it('uses title keywords and summary length for side quests', () => {
    expect(
      inferQuestScale({ kind: 'side', title: 'Rescue the villagers', summary: 'Help them.' })
    ).toBe('major')
    expect(
      inferQuestScale({ kind: 'side', title: 'Herb run', summary: 'Gather herbs.' })
    ).toBe('minor')
  })

  it('shares title heuristics with thread-based loot and XP paths', () => {
    expect(inferQuestScaleFromTitleSummary('Rescue the villagers', 'Help them.')).toBe('major')
    expect(inferQuestScaleFromTitleSummary('Herb run', 'Gather herbs.')).toBe('minor')
  })
})

describe('storyThreadStateToQuestStatus', () => {
  it('maps terminal thread states to completed', () => {
    expect(storyThreadStateToQuestStatus('completed')).toBe('completed')
    expect(storyThreadStateToQuestStatus('resolved')).toBe('completed')
    expect(storyThreadStateToQuestStatus('done')).toBe('completed')
    expect(storyThreadStateToQuestStatus('active')).toBe('active')
  })
})
