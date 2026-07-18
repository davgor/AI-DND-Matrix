import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign, listCampaignsByLastPlayed } from './campaigns'
import { touchLastPlayed } from './sessions'

function seedCampaign(db: ReturnType<typeof createTestDb>, name: string) {
  return createCampaign(db, { name, premisePrompt: '...', deathMode: 'legendary' })
}

describe('sessions repository', () => {
  it('touchLastPlayed creates a session if one does not already exist', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db, 'A')

    touchLastPlayed(db, campaign.id)

    expect(listCampaignsByLastPlayed(db).map((c) => c.id)).toEqual([campaign.id])
  })

  it('touching last_played_at updates the value and reorders listCampaignsByLastPlayed', () => {
    const db = createTestDb()
    const campaignA = seedCampaign(db, 'A')
    const campaignB = seedCampaign(db, 'B')

    touchLastPlayed(db, campaignA.id, '2026-01-01T00:00:00.000Z')
    touchLastPlayed(db, campaignB.id, '2026-01-02T00:00:00.000Z')

    expect(listCampaignsByLastPlayed(db).map((c) => c.id)).toEqual([
      campaignB.id,
      campaignA.id
    ])

    touchLastPlayed(db, campaignA.id, '2026-01-03T00:00:00.000Z')

    expect(listCampaignsByLastPlayed(db).map((c) => c.id)).toEqual([
      campaignA.id,
      campaignB.id
    ])
  })
})
