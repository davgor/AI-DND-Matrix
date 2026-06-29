import { describe, expect, it } from 'vitest'
import { IN_CAMPAIGN_COLUMNS } from '../../../shared/inCampaignLayout/types'

describe('InCampaignLayout shell contract', () => {
  it('requires a DOM region for each semantic column', () => {
    expect(IN_CAMPAIGN_COLUMNS).toHaveLength(4)
    const regionClassByColumn: Record<string, string> = {
      campaigns: 'in-campaign-column--campaigns',
      dmExposition: 'in-campaign-column--dm',
      playerInteraction: 'in-campaign-column--player',
      playerSheet: 'in-campaign-column--sheet'
    }
    for (const column of IN_CAMPAIGN_COLUMNS) {
      expect(regionClassByColumn[column]).toMatch(/^in-campaign-column--/)
    }
  })
})
