import { describe, expect, it } from 'vitest'
import { createTestDb } from '../../db/testUtils'
import { listCampaigns, getCampaignById } from '../../db/repositories/campaigns'
import { listNpcsByRegion } from '../../db/repositories/npcs'
import { listRegionsByCampaign } from '../../db/repositories/regions'
import { listRegionHistoryByRegion } from '../../db/repositories/regionHistory'
import { listStoryThreadsByCampaign } from '../../db/repositories/storyThreads'
import { listQuestHooksByRegion } from '../../db/repositories/worldFacts'
import { createScriptedProvider } from '../providers/mockHarness'
import { buildAvailableRaceOptions } from '../raceLore'
import {
  CampaignGenerationSchemaError,
  MAX_GENERATION_ATTEMPTS,
  buildAdditionalRegionPrompt,
  buildGenerationPrompt,
  buildWorldGenerationPrompt,
  generateAdditionalRegion,
  generateAndPersistCampaign,
  generateCampaignSeed,
  generateSingleNpc,
  hasValidNpcRace,
  hasValidNpcBackground,
  hasValidNpcGender,
  hasValidNpcClass,
  normalizeAdditionalRegion,
  normalizeCampaignGeneration,
  persistRegionWithNpcs,
  resolveInitialGenerationCounts
} from '.'

import {
  ADDITIONAL_REGION,
  LEGACY_NORMALIZE_PAYLOAD,
  LEGACY_CAMPAIGN_SEED_PAYLOAD,
  VALID_WORLD,
  buildCascadingSeedResponses,
  makeNpcs,
  makeRegion,
  npcReviewResponses,
  RACE_LORE_RESPONSE,
  PRE_EXPANSION_CAMPAIGN_PAYLOAD,
  SETUP_INPUT,
  TRIM_NPCS_PAYLOAD
} from './fixtures'
import type { GeneratedNpc, GeneratedRegion } from '.'

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

  it('accepts the pre-expansion campaign shape with two regions and one NPC each', () => {
    const normalized = normalizeCampaignGeneration(PRE_EXPANSION_CAMPAIGN_PAYLOAD, {
      regionCount: 2,
      npcsPerRegion: 1
    })

    expect(normalized?.regions).toHaveLength(2)
    expect(normalized?.npcs).toHaveLength(2)
    expect(normalized?.storyThread.title).toBe('Ventures on the New Ocean')
  })

  it('trims extra regions when the model over-delivers', () => {
    const payload = {
      regions: [
        makeRegion('First', 'a'),
        makeRegion('Second', 'b'),
        makeRegion('Third', 'c')
      ],
      npcs: [...makeNpcs('First', 'F'), ...makeNpcs('Second', 'S')],
      storyThread: { title: 'Arc', state: 'starting', summary: 'Summary.' }
    }
    const normalized = normalizeCampaignGeneration(payload, { regionCount: 2, npcsPerRegion: 3 })

    expect(normalized?.regions).toHaveLength(2)
    expect(normalized?.regions.map((region) => region.name)).toEqual(['First', 'Second'])
  })

  it('accepts fewer than requested NPCs per region when at least one is present', () => {
    const payload = {
      regions: [makeRegion('Oakhollow', 'old'), makeRegion('The Sunken Crown', 'ruin')],
      npcs: [
        ...makeNpcs('Oakhollow', 'Oak').slice(0, 2),
        ...makeNpcs('The Sunken Crown', 'Crown').slice(0, 2)
      ],
      storyThread: { title: 'Partial Cast', state: 'starting', summary: 'A start.' }
    }
    const normalized = normalizeCampaignGeneration(payload, { regionCount: 2, npcsPerRegion: 3 })

    expect(normalized?.npcs).toHaveLength(4)
    expect(normalized?.npcs.filter((npc) => npc.regionName === 'Oakhollow')).toHaveLength(2)
  })
})

describe('generateCampaignSeed legacy compatibility', () => {
  it('accepts older-shaped region payloads in the regions stage', async () => {
    const regions = LEGACY_CAMPAIGN_SEED_PAYLOAD.regions.map((region) => makeRegion(region.name, 'legacy'))
    const responses = buildCascadingSeedResponses({
      regionCount: 2,
      npcsPerRegion: 1,
      regions,
      storyThread: LEGACY_CAMPAIGN_SEED_PAYLOAD.story_thread
    })
    const provider = createScriptedProvider(responses)
    const result = await generateCampaignSeed(
      provider,
      'A new oceanic region has been discovered and explorers are venturing out',
      { regionCount: 2, npcsPerRegion: 1 }
    )
    expect(result.regions).toHaveLength(2)
    expect(result.storyThread.title).toBe('Ventures on the New Ocean')
    expect(result.world.worldName).toBe(VALID_WORLD.worldName)
  })
})

describe('generateCampaignSeed counts (007.1, 039.4, 054.3)', () => {
  it('produces a structured response with exactly requested regions and NPCs per region', async () => {
    const provider = createScriptedProvider(buildCascadingSeedResponses({ regionCount: 2, npcsPerRegion: 3 }))
    const counts = resolveInitialGenerationCounts(2, 3)
    const result = await generateCampaignSeed(provider, 'A flooded kingdom.', counts)

    expect(result.world.worldName).toBe(VALID_WORLD.worldName)
    expect(result.regions).toHaveLength(2)
    expect(result.regions[0]?.recentHistory).toBeTruthy()
    expect(result.regions[0]?.potentialQuests.length).toBeGreaterThanOrEqual(2)
    expect(result.npcs.length).toBe(6)
    expect(result.storyThread.title).toBe('The Crown Beneath the Waves')
  })

  it('accepts zero regions with story thread only', async () => {
    const responses = buildCascadingSeedResponses({
      regionCount: 0,
      npcsPerRegion: 3,
      storyThread: { title: 'Thread Alone', state: 'starting', summary: 'No regions yet.' }
    })
    const provider = createScriptedProvider(responses)
    const result = await generateCampaignSeed(provider, 'A premise.', { regionCount: 0, npcsPerRegion: 3 })
    expect(result.regions).toHaveLength(0)
    expect(result.npcs).toHaveLength(0)
    expect(result.storyThread.title).toBe('Thread Alone')
  })
})

describe('generateCampaignSeed edge counts (054.3)', () => {
  it('persists regions with zero NPCs when configured', async () => {
    const responses = buildCascadingSeedResponses({
      regionCount: 1,
      npcsPerRegion: 0,
      regions: [makeRegion('Empty Vale', 'quiet')],
      storyThread: { title: 'Quiet Start', state: 'starting', summary: 'Sparse world.' }
    })
    const provider = createScriptedProvider(responses)
    const result = await generateCampaignSeed(provider, 'A quiet land.', { regionCount: 1, npcsPerRegion: 0 })
    expect(result.regions).toHaveLength(1)
    expect(result.npcs).toHaveLength(0)
  })
})

describe('buildWorldGenerationPrompt', () => {
  it('asks for world name, summary, and history only', () => {
    const prompt = buildWorldGenerationPrompt('A marsh kingdom')
    expect(prompt).toContain('worldName')
    expect(prompt).toContain('exactly three short paragraphs')
    expect(prompt).not.toContain('"regions"')
  })
})

describe('buildGenerationPrompt', () => {
  it('asks for exact counts from the request', () => {
    const availableRaces = buildAvailableRaceOptions([])
    const prompt = buildGenerationPrompt('A marsh', { regionCount: 1, npcsPerRegion: 1 }, availableRaces)
    expect(prompt).toContain('exactly 1 starting region')
    expect(prompt).toContain('exactly 1 key NPC')
    expect(prompt).toContain('human')
  })

  it('allows zero regions in the prompt', () => {
    const prompt = buildGenerationPrompt('A marsh', { regionCount: 0, npcsPerRegion: 3 }, buildAvailableRaceOptions([]))
    expect(prompt).toContain('no starting regions')
  })
})

describe('buildAdditionalRegionPrompt', () => {
  it('includes the requested NPC count and available races', () => {
    const prompt = buildAdditionalRegionPrompt('Premise', ['Oakhollow'], {
      seedPrompt: 'A foggy marsh',
      npcCount: 0
    }, buildAvailableRaceOptions([]))
    expect(prompt).toContain('no NPCs')
    expect(prompt).toContain('Available races')
  })

  it('includes world context from campaign history when present', () => {
    const prompt = buildAdditionalRegionPrompt('Premise', ['Oakhollow'], {
      seedPrompt: 'A foggy marsh',
      npcCount: 1,
      history: {
        worldName: 'Velmora',
        worldSummary: 'Summary one.\n\nTwo.\n\nThree.',
        worldHistory: 'Past one.\n\nTwo.\n\nThree.\n\nFour.',
        currentStateSummary: '',
        regionSummaries: [],
        storyThreadSummaries: [],
        recentEvents: []
      }
    }, buildAvailableRaceOptions([]))
    expect(prompt).toContain('World name: Velmora')
    expect(prompt).toContain('World summary')
  })
})

describe('generateCampaignSeed schema rejection + retry (007.4, generation half)', () => {
  it('retries past a malformed response and succeeds on a later valid one', async () => {
    const valid = buildCascadingSeedResponses({ regionCount: 2, npcsPerRegion: 3 })
    const provider = createScriptedProvider(['not json', '{"regions":[]}', ...valid])
    const result = await generateCampaignSeed(provider, 'A flooded kingdom.')
    expect(result.storyThread.title).toBe('The Crown Beneath the Waves')
    expect(provider.calls.length).toBeGreaterThan(valid.length)
  })

  it('throws a typed schema error after exhausting retries on persistently malformed output', async () => {
    const provider = createScriptedProvider(['bad', 'still bad', 'nope'])
    await expect(generateCampaignSeed(provider, 'x')).rejects.toBeInstanceOf(
      CampaignGenerationSchemaError
    )
    expect(provider.calls.length).toBeGreaterThanOrEqual(MAX_GENERATION_ATTEMPTS)
  })
})

describe('normalizeAdditionalRegion', () => {
  it('accepts human-readable alignment labels and temperament casing', () => {
    const payload = {
      region: makeRegion('Ashmere Ossuary', 'death'),
      npcs: makeNpcs('Ashmere Ossuary', 'Ash').map((npc) => ({
        ...npc,
        alignment: 'True Neutral',
        temperament: 'Cautious',
        canSpeak: true
      }))
    }
    const normalized = normalizeAdditionalRegion(payload)
    expect(normalized?.region.name).toBe('Ashmere Ossuary')
    expect(normalized?.npcs[0]?.alignment).toBe('true_neutral')
    expect(normalized?.npcs[0]?.temperament).toBe('cautious')
  })
})

describe('generateAdditionalRegion', () => {
  it('returns one region with exactly three NPCs by default', async () => {
    const provider = createScriptedProvider([ADDITIONAL_REGION])
    const result = await generateAdditionalRegion(provider, 'A flooded kingdom.', ['Oakhollow'], {
      seedPrompt: 'A marsh crossing'
    })
    expect(result.region.name).toBe('Mistfen Crossing')
    expect(result.npcs).toHaveLength(3)
    expect(result.npcs.every((npc) => npc.regionName === 'Mistfen Crossing')).toBe(true)
  })

  it('accepts human-readable alignment labels and string canSpeak from the model', async () => {
    const payload = {
      region: makeRegion('Ashmere Ossuary', 'death'),
      npcs: makeNpcs('Ashmere Ossuary', 'Ash').map((npc) => ({
        ...npc,
        alignment: 'True Neutral',
        temperament: 'Cautious',
        canSpeak: 'true'
      }))
    }
    const provider = createScriptedProvider([JSON.stringify(payload)])
    const result = await generateAdditionalRegion(
      provider,
      'A kingdom where death is sacred',
      ['Oakhollow'],
      { seedPrompt: 'A death themed region with cemeteries everywhere' }
    )
    expect(result.region.name).toBe('Ashmere Ossuary')
    expect(result.npcs[0]?.alignment).toBe('true_neutral')
    expect(result.npcs[0]?.temperament).toBe('cautious')
    expect(result.npcs[0]?.canSpeak).toBe(true)
  })

  it('allows zero NPCs when npcCount is 0', async () => {
    const payload = JSON.stringify({
      region: makeRegion('Silent Moor', 'fog'),
      npcs: []
    })
    const provider = createScriptedProvider([payload])
    const result = await generateAdditionalRegion(
      provider,
      'A flooded kingdom.',
      ['Oakhollow'],
      { seedPrompt: 'A quiet moor', npcCount: 0 }
    )
    expect(result.region.name).toBe('Silent Moor')
    expect(result.npcs).toHaveLength(0)
  })
})

describe('generateSingleNpc', () => {
  it('returns one NPC tied to the target region', async () => {
    const payload = JSON.stringify({
      npc: {
        name: 'Rook Vale',
        role: 'hermit',
        backstory: 'Rook keeps to the fog.',
        disposition: 'gruff',
        regionName: 'Oakhollow',
        temperament: 'cautious',
        canSpeak: true,
        alignment: 'true_neutral',
        race: 'human',
        background: 'hermit',
        gender: 'unspecified',
        class: 'commoner'
      }
    })
    const provider = createScriptedProvider([payload])
    const result = await generateSingleNpc(provider, {
      campaignPremise: 'A flooded kingdom.',
      regionName: 'Oakhollow',
      regionDescription: 'A quiet logging village.',
      existingNpcNames: ['Mira'],
      seedPrompt: 'A hermit in the woods',
      availableRaces: buildAvailableRaceOptions([])
    })
    expect(result.npc.name).toBe('Rook Vale')
    expect(result.npc.regionName).toBe('Oakhollow')
    expect(result.npc.raceKey).toBe('human')
    expect(result.npc.backgroundKey).toBe('hermit')
  })
})

describe('hasValidNpcBackground', () => {
  it('requires a valid background for speaking NPCs and omits it for non-speaking NPCs', () => {
    expect(hasValidNpcBackground({ canSpeak: true, background: 'soldier' })).toBe(true)
    expect(hasValidNpcBackground({ canSpeak: true })).toBe(false)
    expect(hasValidNpcBackground({ canSpeak: true, background: 'not_a_real_key' })).toBe(false)
    expect(hasValidNpcBackground({ canSpeak: false })).toBe(true)
  })
})

describe('buildGenerationPrompt background roster (051.2)', () => {
  it('includes BACKGROUND_ROSTER keys in the generation prompt', () => {
    const prompt = buildGenerationPrompt('A flooded kingdom.', { regionCount: 1, npcsPerRegion: 1 }, [])
    expect(prompt).toContain('Available backgrounds')
    expect(prompt).toContain('soldier: Soldier')
    expect(prompt).toContain('folk_hero: Folk Hero')
  })
})

describe('hasValidNpcGender', () => {
  it('requires gender for speaking NPCs and omits it for non-speaking NPCs', () => {
    expect(hasValidNpcGender({ canSpeak: true, gender: 'woman' })).toBe(true)
    expect(hasValidNpcGender({ canSpeak: true })).toBe(false)
    expect(hasValidNpcGender({ canSpeak: false })).toBe(true)
  })
})

describe('hasValidNpcClass', () => {
  it('requires class for speaking NPCs and omits it for non-speaking NPCs', () => {
    expect(hasValidNpcClass({ canSpeak: true, class: 'commoner' })).toBe(true)
    expect(hasValidNpcClass({ canSpeak: true })).toBe(false)
    expect(hasValidNpcClass({ canSpeak: false })).toBe(true)
  })
})

describe('buildGenerationPrompt gender/class rosters (052.3)', () => {
  it('includes gender and class rosters in the generation prompt', () => {
    const prompt = buildGenerationPrompt('A flooded kingdom.', { regionCount: 1, npcsPerRegion: 1 }, [])
    expect(prompt).toContain('Available genders')
    expect(prompt).toContain('woman: Woman')
    expect(prompt).toContain('commoner: Commoner')
  })
})

describe('hasValidNpcRace', () => {
  it('requires race for speaking NPCs and omits it for non-speaking NPCs', () => {
    expect(hasValidNpcRace({ canSpeak: true, race: 'human' })).toBe(true)
    expect(hasValidNpcRace({ canSpeak: true })).toBe(false)
    expect(hasValidNpcRace({ canSpeak: false })).toBe(true)
  })
})

describe('generateAndPersistCampaign persistence (007.2 regions/history + 007.3 npcs/threads)', () => {
  it('writes world fields, regions (with history and quest hooks), NPCs, and the story thread', async () => {
    const db = createTestDb()
    const seedResponses = buildCascadingSeedResponses({ regionCount: 2, npcsPerRegion: 3 })
    const provider = createScriptedProvider([...seedResponses, RACE_LORE_RESPONSE, ...npcReviewResponses(6)])

    const campaign = await generateAndPersistCampaign(db, provider, SETUP_INPUT)

    const fetched = getCampaignById(db, campaign.id)
    expect(fetched?.worldName).toBe(VALID_WORLD.worldName)
    expect(fetched?.worldSummary).toContain('Shattered Expanse')
    expect(fetched?.worldHistory).toContain('Sundering')

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
    expect(npcsInOakhollow.every((npc) => npc.backgroundKey !== null)).toBe(true)

    const threads = listStoryThreadsByCampaign(db, campaign.id)
    expect(threads).toHaveLength(1)
    expect(threads[0]?.title).toBe('The Crown Beneath the Waves')
  })
})

describe('persistRegionWithNpcs', () => {
  it('appends a region with history, quests, and three NPCs', async () => {
    const db = createTestDb()
    const seedResponses = buildCascadingSeedResponses({ regionCount: 2, npcsPerRegion: 3 })
    const provider = createScriptedProvider([...seedResponses, RACE_LORE_RESPONSE, ...npcReviewResponses(6)])
    const campaign = await generateAndPersistCampaign(db, provider, SETUP_INPUT)
    const additional = JSON.parse(ADDITIONAL_REGION) as {
      region: GeneratedRegion
      npcs: GeneratedNpc[]
    }
    const reviewProvider = createScriptedProvider(
      [RACE_LORE_RESPONSE, ...additional.npcs.map(() => '{"upgrade":false}')]
    )
    await persistRegionWithNpcs({
      db,
      provider: reviewProvider,
      campaignId: campaign.id,
      generatedRegion: additional.region,
      generatedNpcs: additional.npcs
    })

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
    const valid = buildCascadingSeedResponses({ regionCount: 2, npcsPerRegion: 3 })
    const provider = createScriptedProvider(['not json', ...valid, RACE_LORE_RESPONSE, ...npcReviewResponses(6)])

    await generateAndPersistCampaign(db, provider, SETUP_INPUT)

    expect(listCampaigns(db)).toHaveLength(1)
    const [campaign] = listCampaigns(db)
    expect(listRegionsByCampaign(db, campaign!.id)).toHaveLength(2)
    expect(listStoryThreadsByCampaign(db, campaign!.id)).toHaveLength(1)
  })
})
