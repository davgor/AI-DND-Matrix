import { describe, expect, it, vi } from 'vitest'
import { assertCampaignStartTransition } from '../../../shared/campaignCreate/stateMachine'

describe('sidebar new campaign entry', () => {
  it('opens modal flow without implying generation has started', () => {
    const onOpenNewCampaign = vi.fn()
    onOpenNewCampaign()
    expect(onOpenNewCampaign).toHaveBeenCalledTimes(1)
    assertCampaignStartTransition('closed', 'form')
  })

  it('allows dismiss and reopen without leaving the form state machine', () => {
    assertCampaignStartTransition('form', 'closed')
    assertCampaignStartTransition('closed', 'form')
  })
})
