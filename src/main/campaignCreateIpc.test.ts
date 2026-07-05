import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { npcReviewResponses, RACE_LORE_RESPONSE } from '../agents/campaignGeneration/fixtures'
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
      backstory: `${prefix} One has lived in ${regionName} for years.`,
      disposition: 'friendly',
      regionName,
      temperament: 'neutral',
      canSpeak: true,
      alignment: 'true_neutral',
      race: 'human'
    },
    {
      name: `${prefix} Two`,
      role: 'merchant',
      backstory: `${prefix} Two runs a stall in ${regionName}.`,
      disposition: 'curious',
      regionName,
      temperament: 'curious',
      canSpeak: true,
      alignment: 'neutral_good',
      race: 'human'
    },
    {
      name: `${prefix} Three`,
      role: 'guard',
      backstory: `${prefix} Three keeps watch near ${regionName}.`,
      disposition: 'wary',
      regionName,
      temperament: 'disciplined',
      canSpeak: true,
      alignment: 'lawful_neutral',
      race: 'human'
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

  it('rejects invalid generation counts', () => {
    expect(
      isValidCreateCampaignRequest({
        sessionId: 's1',
        premisePrompt: 'A haunted marsh',
        regionCount: 99
      })
    ).toBe(false)
  })
})

describe('createCampaignFromRequest success', () => {
  it('persists one campaign on success', async () => {
    resetCampaignCreateForTests()
    const db = createTestDb()
    const provider = createScriptedProvider([VALID_GENERATION, RACE_LORE_RESPONSE, ...npcReviewResponses(6)])
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

  it('honors custom generation counts on the setup input', async () => {
    resetCampaignCreateForTests()
    const db = createTestDb()
    const oneRegionPayload = JSON.stringify({
      regions: [makeRegion('Lonely Reach')],
      npcs: makeNpcs('Lonely Reach', 'Lone'),
      storyThread: { title: 'Solo Arc', state: 'starting', summary: 'A small start.' }
    })
    const provider = createScriptedProvider([oneRegionPayload, RACE_LORE_RESPONSE, ...npcReviewResponses(1)])
    const result = await createCampaignFromRequest(db, provider, {
      sessionId: 'session-counts',
      premisePrompt: 'A sparse frontier',
      regionCount: 1,
      npcsPerRegion: 1
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.detail.regions).toHaveLength(1)
      expect(result.detail.npcs).toHaveLength(1)
    }
  })
})

describe('createCampaignFromRequest failure', () => {
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
