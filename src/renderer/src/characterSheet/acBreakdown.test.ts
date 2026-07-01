import { describe, expect, it } from 'vitest'
import { buildAcBreakdown, formatEquipFailure, SLOT_LABELS } from './acBreakdown'

describe('acBreakdown', () => {
  it('matches engine total for unarmored agility 14', () => {
    const breakdown = buildAcBreakdown(14, [])
    expect(breakdown.total).toBe(12)
    expect(breakdown.base + breakdown.agilityMod).toBe(12)
  })

  it('labels every equipment slot', () => {
    expect(SLOT_LABELS.ring1).toBe('Ring 1')
    expect(SLOT_LABELS.offHand).toBe('Off hand')
  })
})

describe('formatEquipFailure', () => {
  it('maps known failure reasons', () => {
    expect(formatEquipFailure('off_hand_blocked_by_two_hand')).toContain('two-handed')
  })
})
