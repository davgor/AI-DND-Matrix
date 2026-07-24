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

  it('defaults generative tokens to OFF', () => {
    expect(DEFAULT_CAMPAIGN_SETUP_FORM.generativeTokensEnabled).toBe(false)
  })

  it('keeps Use generative tokens? on the campaign start form only (153.1)', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const startFields = readFileSync(join(__dirname, 'CampaignStartFormFields.tsx'), 'utf8')
    expect(startFields).toContain('Use generative tokens?')
    expect(startFields).toContain('generativeTokensEnabled')
  })
})
