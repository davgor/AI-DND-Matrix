import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { listCampaigns } from '../db/repositories/campaigns'
import { listNpcsByRegion } from '../db/repositories/npcs'
import { listRegionsByCampaign } from '../db/repositories/regions'
import { listRegionHistoryByRegion } from '../db/repositories/regionHistory'
import { listStoryThreadsByCampaign } from '../db/repositories/storyThreads'
import { listQuestHooksByRegion } from '../db/repositories/worldFacts'
import { createScriptedProvider } from './providers/mockHarness'
import {
  CampaignGenerationSchemaError,
  MAX_GENERATION_ATTEMPTS,
  generateAdditionalRegion,
  generateAndPersistCampaign,
  generateCampaignSeed,
  normalizeCampaignGeneration,
  persistRegionWithNpcs
} from './campaignGeneration'

import {
  ADDITIONAL_REGION,
  LEGACY_NORMALIZE_PAYLOAD,
  SETUP_INPUT,
  TRIM_NPCS_PAYLOAD,
  VALID_GENERATION
} from './campaignGeneration.fixtures'
import type { GeneratedNpc, GeneratedRegion } from './campaignGeneration'

describe('normalizeCampaignGeneration', () => {
  it('accepts legacy region fields and fills recent history plus quest hooks', () => {
    const normalized = normalizeCampaignGeneration(LEGACY_NORMALIZE_PAYLOAD)

    expect(normalized?.regions[0]?.recentHistory).toContain('Azure Expanse')
    expect(normalized?.regions[0]?.potentialQuests.length).toBeGreaterThanOrEqual(2)
    expect(normalized?.npcs).toHaveLength(6)
  })

  it('trims extra NPCs per region and ignores unknown region tags', () => {
    const normalized = normalizeCampaignGeneration(TRIM_NPCS_PAYLOAD)

    expect(normalized?.npcs.filter((npc) => npc.regionName === 'Azure Expanse')).toHaveLength(3)
    expect(normalized?.npcs.some((npc) => npc.name === 'Stray')).toBe(false)
  })

  it('accepts the pre-expansion campaign shape with two regions and two NPCs', () => {
    const normalized = normalizeCampaignGeneration({
      regions: [
        { name: 'The Azure Deep', description: 'A new oceanic frontier.', historyBackstory: 'Just discovered.' },
        { name: 'Harbor of First Light', description: 'Explorer port.', historyBackstory: 'Built last season.' }
      ],
      npcs: [
        {
          name: 'Captain Reyes',
          role: 'explorer',
          disposition: 'Offers a charter if the party surveys the reef.',
          regionName: 'The Azure Deep',
          temperament: 'cunning',
          canSpeak: true,
          alignment: 'chaotic_good'
        },
        {
          name: 'Sister Mael',
          role: 'chronicler',
          disposition: 'Seeks witnesses to the first landing.',
          regionName: 'Harbor of First Light',
          temperament: 'curious',
          canSpeak: true,
          alignment: 'neutral_good'
        }
      ],
      story_thread: {
        title: 'Ventures on the New Ocean',
        state: 'starting',
        summary: 'Explorers push into uncharted waters.'
      }
    })

    expect(normalized?.regions).toHaveLength(2)
    expect(normalized?.npcs).toHaveLength(2)
    expect(normalized?.storyThread.title).toBe('Ventures on the New Ocean')
  })
})

describe('generateCampaignSeed legacy compatibility', () => {
  it('accepts older-shaped model output after normalization', async () => {
    const legacy = JSON.stringify({
      regions: [
        {
          name: 'The Azure Deep',
          description: 'A newly charted oceanic region.',
          historyBackstory: 'Sailors only recently proved it navigable.'
        },
        {
          name: 'Harbor of First Light',
          description: 'The explorer port.',
          historyBackstory: 'Founded to support the first voyages.'
        }
      ],
      npcs: [
        {
          name: 'Captain Reyes',
          role: 'explorer',
          disposition: 'Offers a charter if the party surveys the reef.',
          regionName: 'The Azure Deep',
          temperament: 'cunning',
          canSpeak: true,
          alignment: 'chaotic_good'
        },
        {
          name: 'Sister Mael',
          role: 'chronicler',
          disposition: 'Seeks witnesses to the first landing.',
          regionName: 'Harbor of First Light',
          temperament: 'curious',
          canSpeak: true,
          alignment: 'neutral_good'
        }
      ],
      story_thread: {
        title: 'Ventures on the New Ocean',
        state: 'starting',
        summary: 'Explorers push into uncharted waters.'
      }
    })
    const provider = createScriptedProvider([legacy])
    const result = await generateCampaignSeed(
      provider,
      'A new oceanic region has been discovered and explorers are venturing out'
    )
    expect(result.regions).toHaveLength(2)
    expect(result.storyThread.title).toBe('Ventures on the New Ocean')
  })
})

describe('generateCampaignSeed (007.1)', () => {
  it('produces a structured response with 2-4 regions, 3 NPCs each, and one story thread', async () => {
    const provider = createScriptedProvider([VALID_GENERATION])
    const result = await generateCampaignSeed(provider, 'A flooded kingdom.')

    expect(result.regions.length).toBeGreaterThanOrEqual(2)
    expect(result.regions.length).toBeLessThanOrEqual(4)
    expect(result.regions[0]?.recentHistory).toBeTruthy()
    expect(result.regions[0]?.potentialQuests.length).toBeGreaterThanOrEqual(2)
    expect(result.npcs.length).toBe(result.regions.length * 3)
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

describe('generateAdditionalRegion', () => {
  it('returns one region with exactly three NPCs', async () => {
    const provider = createScriptedProvider([ADDITIONAL_REGION])
    const result = await generateAdditionalRegion(provider, 'A flooded kingdom.', ['Oakhollow'], 'A marsh crossing')
    expect(result.region.name).toBe('Mistfen Crossing')
    expect(result.npcs).toHaveLength(3)
    expect(result.npcs.every((npc) => npc.regionName === 'Mistfen Crossing')).toBe(true)
  })
})

describe('generateAndPersistCampaign persistence (007.2 regions/history + 007.3 npcs/threads)', () => {
  it('writes regions (with history and quest hooks), NPCs, and the story thread', async () => {
    const db = createTestDb()
    const provider = createScriptedProvider([VALID_GENERATION])

    const campaign = await generateAndPersistCampaign(db, provider, SETUP_INPUT)

    const regions = listRegionsByCampaign(db, campaign.id)
    expect(regions).toHaveLength(2)
    for (const region of regions) {
      const history = listRegionHistoryByRegion(db, region.id)
      expect(history.length).toBeGreaterThanOrEqual(2)
      expect(listQuestHooksByRegion(db, region.id).length).toBeGreaterThanOrEqual(2)
    }

    const oakhollow = regions.find((region) => region.name === 'Oakhollow')
    expect(oakhollow).toBeDefined()
    const npcsInOakhollow = listNpcsByRegion(db, oakhollow!.id)
    expect(npcsInOakhollow).toHaveLength(3)

    const threads = listStoryThreadsByCampaign(db, campaign.id)
    expect(threads).toHaveLength(1)
    expect(threads[0]?.title).toBe('The Crown Beneath the Waves')
  })
})

describe('persistRegionWithNpcs', () => {
  it('appends a region with history, quests, and three NPCs', async () => {
    const db = createTestDb()
    const provider = createScriptedProvider([VALID_GENERATION])
    const campaign = await generateAndPersistCampaign(db, provider, SETUP_INPUT)
    const additional = JSON.parse(ADDITIONAL_REGION) as {
      region: GeneratedRegion
      npcs: GeneratedNpc[]
    }
    persistRegionWithNpcs(db, campaign.id, additional.region, additional.npcs)

    const regions = listRegionsByCampaign(db, campaign.id)
    expect(regions).toHaveLength(3)
    const mistfen = regions.find((region) => region.name === 'Mistfen Crossing')
    expect(mistfen).toBeDefined()
    expect(listNpcsByRegion(db, mistfen!.id)).toHaveLength(3)
    expect(listQuestHooksByRegion(db, mistfen!.id)).toHaveLength(2)
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
