import { describe, expect, it } from 'vitest'
import { IN_CAMPAIGN_COLUMNS } from './types'

describe('in-campaign layout column contract', () => {
  it('defines four semantic regions in play order', () => {
    expect(IN_CAMPAIGN_COLUMNS).toEqual(['campaigns', 'dmExposition', 'playerInteraction', 'playerSheet'])
  })
})
