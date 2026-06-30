import { describe, expect, it } from 'vitest'
import { DEFAULT_CAMPAIGN_SETUP_FORM } from '../../../shared/campaignCreate/types'
import { clampNpcsPerRegion, clampRegionCount } from '../../../shared/campaignCreate/validation'

describe('CampaignStartFormFields generation defaults', () => {
  it('uses shared defaults and bound clamps for generation counts', () => {
    expect(DEFAULT_CAMPAIGN_SETUP_FORM.regionCount).toBe(2)
    expect(DEFAULT_CAMPAIGN_SETUP_FORM.npcsPerRegion).toBe(3)
    expect(clampRegionCount(99)).toBe(5)
    expect(clampRegionCount(-1)).toBe(0)
    expect(clampNpcsPerRegion(11)).toBe(10)
    expect(clampNpcsPerRegion(-1)).toBe(0)
  })
})
