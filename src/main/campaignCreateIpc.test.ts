import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { isValidCreateCampaignRequest } from '../shared/campaignCreate/validation'
import { createCampaignFromRequest, resetCampaignCreateForTests } from './campaignCreateIpc'

const VALID_GENERATION = JSON.stringify({
  regions: [
    { name: 'Oakhollow', description: 'A place.', historyBackstory: 'Some history.' },
    { name: 'Oakhollow Outskirts', description: 'Nearby.', historyBackstory: 'More history.' }
  ],
  npcs: [
    { name: 'Mira', role: 'shopkeeper', disposition: 'friendly', regionName: 'Oakhollow' },
    { name: 'Borin', role: 'guard', disposition: 'neutral', regionName: 'Oakhollow' }
  ],
  storyThread: { title: 'Main Arc', state: 'starting', summary: 'A summary.' }
})

describe('isValidCreateCampaignRequest', () => {
  it('accepts a minimal valid payload', () => {
    expect(
      isValidCreateCampaignRequest({ sessionId: 's1', premisePrompt: 'A haunted marsh' })
    ).toBe(true)
  })

  it('rejects missing premise', () => {
    expect(isValidCreateCampaignRequest({ sessionId: 's1', premisePrompt: '  ' })).toBe(false)
  })
})

describe('createCampaignFromRequest', () => {
  it('persists one campaign on success', async () => {
    resetCampaignCreateForTests()
    const db = createTestDb()
    const provider = createScriptedProvider([VALID_GENERATION])
    const result = await createCampaignFromRequest(db, provider, {
      sessionId: 'session-1',
      premisePrompt: 'A haunted marsh',
      deathMode: 'standard'
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.detail.regions.length).toBeGreaterThan(0)
    }
  })

  it('returns typed generation failure without partial rows', async () => {
    resetCampaignCreateForTests()
    const db = createTestDb()
    const provider = createScriptedProvider(['not-json'])
    const before = db.prepare('SELECT COUNT(*) as count FROM campaigns').get() as { count: number }
    const result = await createCampaignFromRequest(db, provider, {
      sessionId: 'session-2',
      premisePrompt: 'Broken'
    })
    const after = db.prepare('SELECT COUNT(*) as count FROM campaigns').get() as { count: number }
    expect(result.ok).toBe(false)
    expect(after.count).toBe(before.count)
  })
})
