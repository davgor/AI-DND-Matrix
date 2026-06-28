import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { listCampaigns } from '../db/repositories/campaigns'
import { listNpcsByRegion } from '../db/repositories/npcs'
import { listRegionsByCampaign } from '../db/repositories/regions'
import { listRegionHistoryByRegion } from '../db/repositories/regionHistory'
import { listStoryThreadsByCampaign } from '../db/repositories/storyThreads'
import { createScriptedProvider } from './providers/mockHarness'
import {
  CampaignGenerationSchemaError,
  MAX_GENERATION_ATTEMPTS,
  generateAndPersistCampaign,
  generateCampaignSeed
} from './campaignGeneration'

const VALID_GENERATION = JSON.stringify({
  regions: [
    { name: 'Oakhollow', description: 'A quiet logging village.', historyBackstory: 'Founded a century ago.' },
    { name: 'The Sunken Crown', description: 'A flooded ruin.', historyBackstory: 'Once a royal seat.' }
  ],
  npcs: [
    { name: 'Mira the Woodcutter', role: 'shopkeeper', disposition: 'friendly', regionName: 'Oakhollow' },
    { name: 'The Drowned King', role: 'boss', disposition: 'hostile', regionName: 'The Sunken Crown' }
  ],
  storyThread: { title: 'The Crown Beneath the Waves', state: 'starting', summary: 'A throne lies hidden.' }
})

const SETUP_INPUT = { name: 'Test Campaign', premisePrompt: 'A flooded kingdom.', deathMode: 'legendary' } as const

describe('generateCampaignSeed (007.1)', () => {
  it('produces a structured response with 2-4 regions, at least 2 NPCs, and one story thread', async () => {
    const provider = createScriptedProvider([VALID_GENERATION])
    const result = await generateCampaignSeed(provider, 'A flooded kingdom.')

    expect(result.regions.length).toBeGreaterThanOrEqual(2)
    expect(result.regions.length).toBeLessThanOrEqual(4)
    expect(result.npcs.length).toBeGreaterThanOrEqual(2)
    expect(result.storyThread.title).toBe('The Crown Beneath the Waves')
  })
})

describe('generateCampaignSeed schema rejection + retry (007.4, generation half)', () => {
  it('retries past a malformed response and succeeds on a later valid one', async () => {
    const provider = createScriptedProvider(['not json', '{"regions":[]}', VALID_GENERATION])
    const result = await generateCampaignSeed(provider, 'A flooded kingdom.')
    expect(result.storyThread.title).toBe('The Crown Beneath the Waves')
    expect(provider.calls).toHaveLength(3)
  })

  it('throws a typed schema error after exhausting retries on persistently malformed output', async () => {
    const provider = createScriptedProvider(['bad', 'still bad', 'nope'])
    await expect(generateCampaignSeed(provider, 'x')).rejects.toBeInstanceOf(
      CampaignGenerationSchemaError
    )
    expect(provider.calls).toHaveLength(MAX_GENERATION_ATTEMPTS)
  })
})

describe('generateAndPersistCampaign persistence (007.2 regions/history + 007.3 npcs/threads)', () => {
  it('writes regions (each with a seeded region_history entry), NPCs, and the story thread', async () => {
    const db = createTestDb()
    const provider = createScriptedProvider([VALID_GENERATION])

    const campaign = await generateAndPersistCampaign(db, provider, SETUP_INPUT)

    const regions = listRegionsByCampaign(db, campaign.id)
    expect(regions).toHaveLength(2)
    for (const region of regions) {
      expect(listRegionHistoryByRegion(db, region.id).length).toBeGreaterThanOrEqual(1)
    }

    const oakhollow = regions.find((region) => region.name === 'Oakhollow')
    expect(oakhollow).toBeDefined()
    const npcsInOakhollow = listNpcsByRegion(db, oakhollow!.id)
    expect(npcsInOakhollow).toHaveLength(1)
    expect(npcsInOakhollow[0]?.name).toBe('Mira the Woodcutter')

    const threads = listStoryThreadsByCampaign(db, campaign.id)
    expect(threads).toHaveLength(1)
    expect(threads[0]?.title).toBe('The Crown Beneath the Waves')
  })
})

describe('generateAndPersistCampaign atomicity (007.4, persistence half)', () => {
  it('leaves no partial rows from a malformed attempt — exactly one complete campaign after malformed-then-valid', async () => {
    const db = createTestDb()
    const provider = createScriptedProvider(['not json', VALID_GENERATION])

    await generateAndPersistCampaign(db, provider, SETUP_INPUT)

    expect(listCampaigns(db)).toHaveLength(1)
    const [campaign] = listCampaigns(db)
    expect(listRegionsByCampaign(db, campaign!.id)).toHaveLength(2)
    expect(listStoryThreadsByCampaign(db, campaign!.id)).toHaveLength(1)
  })
})
