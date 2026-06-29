import { describe, expect, it } from 'vitest'
import { assertCampaignStartTransition, canCampaignStartTransition } from './stateMachine'

describe('campaign start view transitions', () => {
  it('supports open, submit, success close, and error recovery paths', () => {
    expect(canCampaignStartTransition('closed', 'form')).toBe(true)
    expect(canCampaignStartTransition('form', 'loading')).toBe(true)
    expect(canCampaignStartTransition('loading', 'closed')).toBe(true)
    expect(canCampaignStartTransition('error', 'form')).toBe(true)
    expect(canCampaignStartTransition('error', 'loading')).toBe(true)
  })

  it('rejects illegal transitions', () => {
    expect(canCampaignStartTransition('closed', 'loading')).toBe(false)
    expect(() => assertCampaignStartTransition('closed', 'loading')).toThrow(/Illegal/)
  })
})
