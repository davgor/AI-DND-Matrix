import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('CampaignReview generative tokens policy (153.1)', () => {
  it('does not wire a generative tokens toggle on the review page', () => {
    const review = readFileSync(join(__dirname, 'CampaignReview.tsx'), 'utf8')
    expect(review).not.toContain('CampaignReviewGenerativeTokensToggle')
    expect(review).not.toContain('saveGenerativeTokens')
    expect(review).not.toContain('Use generative tokens?')
  })

  it('does not keep a review-only generative tokens toggle module', () => {
    expect(() =>
      readFileSync(join(__dirname, 'CampaignReviewGenerativeTokensToggle.tsx'), 'utf8')
    ).toThrow()
  })

  it('does not expose saveGenerativeTokens on review savers', () => {
    const savers = readFileSync(join(__dirname, 'campaignReviewSavers.ts'), 'utf8')
    expect(savers).not.toContain('saveGenerativeTokens')
    expect(savers).not.toContain('editGenerativeTokens')
  })
})
