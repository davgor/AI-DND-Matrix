import { describe, expect, it } from 'vitest'
import {
  campaignReviewContinueMessage,
  canContinueCampaignReview,
  getCampaignReviewContinueBlockers
} from './campaignReviewValidation'

describe('getCampaignReviewContinueBlockers', () => {
  it('blocks when there are no regions', () => {
    expect(getCampaignReviewContinueBlockers({ regions: [], npcs: [{ id: 'n1' } as never] })).toEqual([
      'no-regions'
    ])
  })

  it('blocks when there are no NPCs', () => {
    expect(
      getCampaignReviewContinueBlockers({
        regions: [{ id: 'r1' } as never],
        npcs: []
      })
    ).toEqual(['no-npcs'])
  })

  it('is empty when both thresholds are met', () => {
    expect(
      getCampaignReviewContinueBlockers({
        regions: [{ id: 'r1' } as never],
        npcs: [{ id: 'n1' } as never]
      })
    ).toEqual([])
  })
})

describe('canContinueCampaignReview', () => {
  it('returns false when blocked and true when unblocked', () => {
    expect(canContinueCampaignReview({ regions: [], npcs: [] })).toBe(false)
    expect(
      canContinueCampaignReview({
        regions: [{ id: 'r1' } as never],
        npcs: [{ id: 'n1' } as never]
      })
    ).toBe(true)
  })
})

describe('campaignReviewContinueMessage', () => {
  it('describes missing regions and NPCs', () => {
    expect(campaignReviewContinueMessage(['no-regions', 'no-npcs'])).toMatch(/region/)
    expect(campaignReviewContinueMessage(['no-npcs'])).toMatch(/NPC/)
  })
})
