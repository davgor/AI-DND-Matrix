import { describe, expect, it } from 'vitest'
import { isTurnRoutingPlan, sanitizeRoutingPlan, type TurnRoutingPlan } from './types'

describe('isTurnRoutingPlan', () => {
  it('accepts a valid composite plan with ordered beats', () => {
    const plan = {
      disposition: 'composite',
      beats: [
        { kind: 'playerActionExpression', actionDescription: 'Kael draws his sword.' },
        { kind: 'dmNarration' },
        { kind: 'npcResponse', npcIds: ['npc-1'] }
      ]
    }
    expect(isTurnRoutingPlan(plan)).toBe(true)
  })

  it('rejects plans with invalid disposition or beat shapes', () => {
    expect(isTurnRoutingPlan({ disposition: 'unknown', beats: [] })).toBe(false)
    expect(isTurnRoutingPlan({ disposition: 'converse', beats: [{ kind: 'npcResponse' }] })).toBe(
      false
    )
    expect(
      isTurnRoutingPlan({
        disposition: 'act',
        beats: [{ kind: 'playerActionExpression', actionDescription: '   ' }]
      })
    ).toBe(false)
  })
})

describe('sanitizeRoutingPlan', () => {
  it('strips unknown npc ids and drops empty npc beats', () => {
    const plan: TurnRoutingPlan = {
      disposition: 'converse',
      beats: [
        { kind: 'npcResponse', npcIds: ['valid', 'ghost'] },
        { kind: 'dmNarration' }
      ]
    }
    const sanitized = sanitizeRoutingPlan(plan, ['valid'])
    expect(sanitized.beats).toEqual([
      { kind: 'npcResponse', npcIds: ['valid'] },
      { kind: 'dmNarration' }
    ])
  })
})
