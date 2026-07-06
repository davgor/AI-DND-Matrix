import { describe, expect, it } from 'vitest'
import { createTestDb } from './testUtils'
import { createCampaign, getCampaignById } from './repositories/campaigns'

describe('campaign world migration (054.1)', () => {
  it('adds world_name, world_summary, and world_history with empty defaults', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Legacy',
      premisePrompt: 'An old save.',
      deathMode: 'legendary'
    })

    const fetched = getCampaignById(db, campaign.id)
    expect(fetched?.worldName).toBe('')
    expect(fetched?.worldSummary).toBe('')
    expect(fetched?.worldHistory).toBe('')
  })
})
