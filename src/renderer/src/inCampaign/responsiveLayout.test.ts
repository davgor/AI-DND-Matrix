import { describe, expect, it } from 'vitest'
import { resolveInCampaignLayoutMode } from '../../../shared/inCampaignLayout/breakpoints'

describe('responsive in-campaign layout modes', () => {
  it('supports desktop four-column and narrowed fallback states', () => {
    expect(resolveInCampaignLayoutMode(1400)).toBe('four-column')
    expect(resolveInCampaignLayoutMode(1050)).toBe('sheet-overlay')
    expect(resolveInCampaignLayoutMode(720)).toBe('compact')
  })
})
