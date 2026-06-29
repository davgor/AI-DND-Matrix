import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { isValidCreateCampaignRequest } from '../shared/campaignCreate/validation'
import { createCampaignFromRequest, resetCampaignCreateForTests } from './campaignCreateIpc'

function makeRegion(name: string) {
  return {
    name,
    description: `Description of ${name}.`,
    historyBackstory: `History of ${name}.`,
    recentHistory: `Recent events in ${name}.`,
    potentialQuests: [`Quest in ${name}`, `Another quest in ${name}`]
  }
}

function makeNpcs(regionName: string, prefix: string) {
  return [
    {
      name: `${prefix} One`,
      role: 'guide',
      disposition: 'friendly',
      regionName,
      temperament: 'neutral',
      canSpeak: true,
      alignment: 'true_neutral'
    },
    {
      name: `${prefix} Two`,
      role: 'merchant',
      disposition: 'curious',
      regionName,
      temperament: 'curious',
      canSpeak: true,
      alignment: 'neutral_good'
    },
    {
      name: `${prefix} Three`,
      role: 'guard',
      disposition: 'wary',
      regionName,
      temperament: 'disciplined',
      canSpeak: true,
      alignment: 'lawful_neutral'
    }
  ]
}

const VALID_GENERATION = JSON.stringify({
  regions: [makeRegion('Oakhollow'), makeRegion('Oakhollow Outskirts')],
  npcs: [...makeNpcs('Oakhollow', 'Oak'), ...makeNpcs('Oakhollow Outskirts', 'Out')],
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
      expect(result.detail.regionExtras.length).toBe(result.detail.regions.length)
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
