import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { listSessionsByLastPlayed, startSession, touchLastPlayed } from './sessions'

function seedCampaign(db: ReturnType<typeof createTestDb>, name: string) {
  return createCampaign(db, { name, premisePrompt: '...', deathMode: 'legendary' })
}

describe('sessions repository', () => {
  it('starts a session with started_at and last_played_at set', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db, 'A')

    const session = startSession(db, campaign.id)

    expect(session.campaignId).toBe(campaign.id)
    expect(session.startedAt).toBe(session.lastPlayedAt)
  })

  it('touching last_played_at updates the value and reorders listByLastPlayed', () => {
    const db = createTestDb()
    const campaignA = seedCampaign(db, 'A')
    const campaignB = seedCampaign(db, 'B')

    startSession(db, campaignA.id, '2026-01-01T00:00:00.000Z')
    startSession(db, campaignB.id, '2026-01-02T00:00:00.000Z')

    expect(listSessionsByLastPlayed(db).map((s) => s.campaignId)).toEqual([
      campaignB.id,
      campaignA.id
    ])

    touchLastPlayed(db, campaignA.id, '2026-01-03T00:00:00.000Z')

    expect(listSessionsByLastPlayed(db).map((s) => s.campaignId)).toEqual([
      campaignA.id,
      campaignB.id
    ])
  })

  it('touchLastPlayed creates a session if one does not already exist', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db, 'A')

    touchLastPlayed(db, campaign.id)

    expect(listSessionsByLastPlayed(db).map((s) => s.campaignId)).toEqual([campaign.id])
  })
})
