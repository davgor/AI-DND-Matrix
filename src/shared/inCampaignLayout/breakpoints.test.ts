import { describe, expect, it } from 'vitest'
import { IN_CAMPAIGN_BREAKPOINTS, minimumWidthForFourColumns, resolveInCampaignLayoutMode } from './breakpoints'

describe('in-campaign layout breakpoints', () => {
  it('uses four columns on wide desktop viewports', () => {
    expect(resolveInCampaignLayoutMode(IN_CAMPAIGN_BREAKPOINTS.fourColumn)).toBe('four-column')
    expect(resolveInCampaignLayoutMode(1600)).toBe('four-column')
  })

  it('falls back to sheet overlay on medium widths', () => {
    expect(resolveInCampaignLayoutMode(IN_CAMPAIGN_BREAKPOINTS.sheetOverlay)).toBe('sheet-overlay')
    expect(resolveInCampaignLayoutMode(1100)).toBe('sheet-overlay')
  })

  it('uses compact overlay rules on narrow widths', () => {
    expect(resolveInCampaignLayoutMode(800)).toBe('compact')
  })

  it('defines a minimum width that fits all four expanded columns', () => {
    expect(minimumWidthForFourColumns()).toBeGreaterThanOrEqual(900)
  })
})
