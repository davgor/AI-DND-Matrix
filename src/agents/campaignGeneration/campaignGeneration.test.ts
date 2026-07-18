import { describe, expect, it } from 'vitest'
import { createTestDb } from '../../db/testUtils'
import { listCampaigns, getCampaignById } from '../../db/repositories/campaigns'
import { listNpcsByRegion } from '../../db/repositories/npcs'
import { listRegionsByCampaign } from '../../db/repositories/regions'
import { listRegionHistoryByRegion } from '../../db/repositories/regionHistory'
import { listStoryThreadsByCampaign } from '../../db/repositories/storyThreads'
import { listQuestHooksByRegion } from '../../db/repositories/worldFacts'
import { createScriptedProvider } from '../providers/mockHarness'
import type { ScriptedResponse } from '../providers/mockHarness'
import type { Provider } from '../providers/types'
import { buildAvailableRaceOptions } from '../raceLore'
import {
  CampaignGenerationSchemaError,
  MAX_GENERATION_ATTEMPTS,
  buildAdditionalRegionPrompt,
  buildCanonRecallPrompt,
  buildGenerationPrompt,
  buildPantheonGenerationPrompt,
  buildRegionsGenerationPrompt,
  buildWorldGenerationPrompt,
  formatDeityDigest,
  generateAdditionalRegion,
  generateAndPersistCampaign,
  generateCampaignSeed,
  generateCampaignWorld,
  generateSingleNpc,
  hasValidNpcRace,
  hasValidNpcBackground,
  hasValidNpcGender,
  hasValidNpcClass,
  normalizeAdditionalRegion,
  normalizeCampaignGeneration,
  normalizeCanonRecall,
  persistRegionWithNpcs,
  resolveInitialGenerationCounts
} from '.'

import {
  ADDITIONAL_REGION,
  LEGACY_NORMALIZE_PAYLOAD,
  LEGACY_CAMPAIGN_SEED_PAYLOAD,
  REALISTIC_LLM_WORLD,
  VALID_WORLD,
  EMPTY_CANON_RESPONSE,
  VALID_PANTHEON_RESPONSE,
  buildCascadingSeedResponses,
  buildShieldHeroCascadingSeedResponses,
  makeNpcs,
  makeRegion,
  npcReviewResponses,
  RACE_LORE_RESPONSE,
  PRE_EXPANSION_CAMPAIGN_PAYLOAD,
  SETUP_INPUT,
  TRIM_NPCS_PAYLOAD
} from './fixtures'
import type { GeneratedNpc, GeneratedRegion } from '.'
import type { CreateCampaignStage } from '../../shared/campaignCreate/types'
import { countParagraphs, coerceNpcTemperament, hasRepeatedSentences, isValidGeneratedPantheon, isValidGeneratedWorld, normalizeGeneratedPantheon, normalizeGeneratedWorld, normalizeGeneratedNpc, normalizeRaceKeyForRoster } from './normalize'
import { findProseJargonViolations } from './proseJargonGuard'

const VORATH_STACKED_SUMMARY =
  'Vorath endures as a land of towering evergreens, fog-veiled vales, and shattered ziggurats where the wind carries howls from forgotten barrows. Sorcerer-kings once ruled from obsidian thrones, their spells binding elementals to forge eternal citadels. Now wilds reclaim those halls, and lanterns flicker in ward-posts manned by rune-scribed watchmen. Dwarven forge-clans hammer blades in mountain delves while elven wardens weave illusions over sacred groves.\n\nHarbor towns tax moorings twice while salvage cults argue over wreck rights. Farmers watch refugee columns pass each autumn.\n\nPower is fragmented today — harbor councils, company charters, and free captains all claim legitimacy. The weather still decides who eats when the squall season arrives.'

describe('normalizeGeneratedWorld', () => {
  it('counts single-newline paragraph breaks from live models', () => {
    expect(countParagraphs(REALISTIC_LLM_WORLD.world_summary as string)).toBeGreaterThanOrEqual(3)
    expect(countParagraphs(REALISTIC_LLM_WORLD.world_history as string)).toBeGreaterThanOrEqual(5)
    expect(isValidGeneratedWorld(REALISTIC_LLM_WORLD)).toBe(true)
  })

  it('rejects short world prose instead of padding it with filler', () => {
    const shortWorld = {
      worldName: 'Venn Calder',
      worldSummary: 'A mountain pass holds the last harvest stores.',
      worldHistory: 'Bandits wear the faces of the dead.'
    }
    const normalized = normalizeGeneratedWorld(shortWorld)
    expect(normalized?.worldSummary).toContain('mountain pass')
    expect(isValidGeneratedWorld(shortWorld)).toBe(false)
  })

  it('rejects history that only meets length after boilerplate padding', () => {
    const thinHistory = [
      'In the Dawnveil the Elder Titans shaped the land and slept.',
      'The Age of Forges ended in the Godwrought War.',
      'The Shattered Epoch saw sword-lords carve kingdoms from wreckage.',
      'The Veiled Restoration quelled incursions but whispers grew.',
      'Now the present teeters as rivers shift and seers dream of ruin.'
    ].join('\n\n')
    const candidate = {
      worldName: 'Elyndor',
      worldSummary: 'Hook one.\n\nHook two.\n\nHook three.',
      worldHistory: thinHistory
    }
    expect(isValidGeneratedWorld(candidate)).toBe(false)
  })

  it('rejects prose with repeated sentences', () => {
    const repeated =
      'Travelers still tell the tale around hearths when trade routes grow dangerous. ' +
      'Iron guilds feud with marsh wardens. ' +
      'Travelers still tell the tale around hearths when trade routes grow dangerous.'
    const candidate = {
      worldName: 'Eryndor',
      worldSummary: `${repeated}\n\nSecond hook names a river port and its toll wars. Merchants hire guards before harvest season.\n\nThird hook warns that border forts are understaffed after the last raid.`,
      worldHistory: VALID_WORLD.worldHistory
    }
    expect(hasRepeatedSentences(candidate.worldSummary)).toBe(true)
    expect(isValidGeneratedWorld(candidate)).toBe(false)
  })
})

describe('normalizeGeneratedNpc live-model coercions', () => {
  it('coerces unknown temperament labels to neutral', () => {
    expect(coerceNpcTemperament('friendly')).toBe('neutral')
  })

  it('maps unknown race labels to a roster preset', () => {
    expect(normalizeRaceKeyForRoster('Ashborn')).toBe('human')
    const npc = normalizeGeneratedNpc({
      name: 'Mara',
      role: 'scout',
      disposition: 'wary',
      regionName: 'Pass',
      temperament: 'friendly',
      canSpeak: true,
      alignment: 'neutral_good',
      race: 'Ashborn',
      background: 'folk_hero',
      gender: 'woman',
      class: 'commoner',
      backstory: 'Mara grew up in the pass.'
    })
    expect(npc?.temperament).toBe('neutral')
    expect(npc?.raceKey).toBe('human')
  })
})

describe('generateCampaignSeed NPC slot retries', () => {
  it('retries NPC slot generation when the model reuses an existing name', async () => {
    const regions = [makeRegion('Ashen Crown Bazaar', 'desert')]
    const firstNpc = { ...makeNpcs('Ashen Crown Bazaar', 'One')[0]!, name: 'Alice' }
    const duplicateNpc = { ...firstNpc }
    const uniqueNpc = { ...firstNpc, name: 'Bob' }
    const provider = createScriptedProvider([
      EMPTY_CANON_RESPONSE,
      VALID_PANTHEON_RESPONSE,
      JSON.stringify(VALID_WORLD),
      JSON.stringify({ regions }),
      JSON.stringify({ npc: firstNpc }),
      JSON.stringify({ npc: duplicateNpc }),
      JSON.stringify({ npc: uniqueNpc }),
      JSON.stringify({ storyThread: { title: 'Arc', state: 'starting', summary: 'S' } })
    ])
    const result = await generateCampaignSeed(provider, 'premise', { regionCount: 1, npcsPerRegion: 2 })
    expect(result.npcs).toHaveLength(2)
    expect(result.npcs.map((npc) => npc.name).sort()).toEqual(['Alice', 'Bob'].sort())
  })
})

describe('generateCampaignSeed progress', () => {
  it('reports progress through each generation stage', async () => {
    const counts = { regionCount: 2, npcsPerRegion: 1 }
    const provider = createScriptedProvider(
      buildCascadingSeedResponses({
        regionCount: counts.regionCount,
        npcsPerRegion: counts.npcsPerRegion,
        regions: [makeRegion('North Vale', 'north'), makeRegion('South Fen', 'fen')]
      })
    )
    const stages: CreateCampaignStage[] = []
    await generateCampaignSeed(provider, 'premise', {
      ...counts,
      availableRaces: buildAvailableRaceOptions([]),
      onProgress: (stage) => {
        stages.push(stage)
      }
    })
    expect(stages[0]).toBe('canon')
    expect(stages).toContain('pantheon')
    expect(stages).toContain('world')
    expect(stages.indexOf('pantheon')).toBeGreaterThan(stages.indexOf('canon'))
    expect(stages.indexOf('world')).toBeGreaterThan(stages.indexOf('pantheon'))
    expect(stages.indexOf('regions')).toBeGreaterThan(stages.indexOf('world'))
    expect(stages).toContain('regions')
    expect(stages.filter((stage) => stage === 'npcs').length).toBeGreaterThanOrEqual(2)
    expect(stages).toContain('story')
    expect(stages.indexOf('story')).toBeGreaterThan(stages.lastIndexOf('npcs'))
  })
})

describe('fandom canon-recall seeding (070)', () => {
  it('prefers Melromarc and Raphtalia when premise and canon list them', async () => {
    const provider = createScriptedProvider(
      buildShieldHeroCascadingSeedResponses({ regionCount: 2, npcsPerRegion: 1 })
    )
    const result = await generateCampaignSeed(
      provider,
      'Campaign set in the world of the shield hero',
      { regionCount: 2, npcsPerRegion: 1, availableRaces: buildAvailableRaceOptions([]) }
    )
    expect(result.regions.map((region) => region.name)).toContain('Melromarc')
    expect(result.npcs.map((npc) => npc.name)).toContain('Raphtalia')
  })

  it('prefers known setting deities in the pantheon roster', async () => {
    const provider = createScriptedProvider(
      buildShieldHeroCascadingSeedResponses({ regionCount: 1, npcsPerRegion: 1 })
    )
    const result = await generateCampaignSeed(
      provider,
      'Campaign set in the world of the shield hero',
      { regionCount: 1, npcsPerRegion: 1, availableRaces: buildAvailableRaceOptions([]) }
    )
    const names = result.pantheon.deities.map((deity) => deity.name)
    expect(names).toContain('The Three Heroes')
    expect(names).toContain('Ost Hero')
  })
})

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
    expect(prompt).toContain('Tyria')
    expect(prompt).toContain('science fiction')
    expect(prompt).toContain('five paragraphs')
    expect(prompt).toContain('three full sentences')
    expect(prompt).not.toContain('"regions"')
  })

  it('discourages default kraken and ziggurat tropes', () => {
    const prompt = buildWorldGenerationPrompt('A marsh kingdom')
    expect(prompt).toContain('krakens')
    expect(prompt).toContain('ziggurats')
    expect(prompt).toContain('border wars')
  })

  it('asks for plain English fantasy, not hyphen-compound jargon', () => {
    const prompt = buildWorldGenerationPrompt('A marsh kingdom')
    expect(prompt).toContain('standard English')
    expect(prompt).toContain('fog-dwellers')
    expect(prompt).toContain('rune-etched')
    expect(prompt).not.toContain('Hyphenated fantasy terms are fine in moderation')
    expect(prompt).not.toContain('storm-priests')
    expect(prompt).not.toContain('fog-veiled')
    expect(prompt).not.toContain('storm-wracked')
  })
})

describe('buildCanonRecallPrompt (070)', () => {
  it('asks for known places, characters, and deities', () => {
    const prompt = buildCanonRecallPrompt('world of the shield hero')
    expect(prompt).toContain('knownPlaces')
    expect(prompt).toContain('knownCharacters')
    expect(prompt).toContain('knownDeities')
    expect(prompt).toContain('Melromarc')
    expect(prompt).toContain('Raphtalia')
    expect(prompt).toContain('Do NOT invent fake')
  })
})

describe('buildRegionsGenerationPrompt canon context (070)', () => {
  it('includes known places when canon is present', () => {
    const prompt = buildRegionsGenerationPrompt(
      'world of the shield hero',
      VALID_WORLD,
      { regionCount: 2, npcsPerRegion: 1 },
      {
        recognizedSetting: true,
        settingLabel: 'The Rising of the Shield Hero',
        knownPlaces: ['Melromarc', 'Siltvelt'],
        knownCharacters: ['Raphtalia'],
        knownDeities: ['The Three Heroes']
      }
    )
    expect(prompt).toContain('Melromarc')
    expect(prompt).toContain('prefer those exact names')
  })
})

describe('normalizeCanonRecall (070)', () => {
  it('accepts snake_case and empty unrecognized payloads', () => {
    expect(
      normalizeCanonRecall({
        recognized_setting: true,
        setting_label: 'Shield Hero',
        known_places: ['Melromarc', 'melromarc', 'Siltvelt'],
        known_characters: ['Raphtalia'],
        known_deities: ['The Three Heroes', 'Ost Hero']
      })
    ).toEqual({
      recognizedSetting: true,
      settingLabel: 'Shield Hero',
      knownPlaces: ['Melromarc', 'Siltvelt'],
      knownCharacters: ['Raphtalia'],
      knownDeities: ['The Three Heroes', 'Ost Hero']
    })
    expect(normalizeCanonRecall(null)).toEqual({
      recognizedSetting: false,
      settingLabel: '',
      knownPlaces: [],
      knownCharacters: [],
      knownDeities: []
    })
  })
})

describe('normalizeGeneratedPantheon (059)', () => {
  it('tolerates snake_case and comma-joined domains', () => {
    const normalized = normalizeGeneratedPantheon({
      pantheon_summary: 'Faith is a bargain.\n\nTemples argue.\n\nSome names are lost.',
      deities: Array.from({ length: 8 }, (_, index) => ({
        name: `God ${index + 1}`,
        epithet: index === 0 ? 'the First' : undefined,
        domains: index % 2 === 0 ? 'war, sea' : ['harvest'],
        tenets: 'Keep vigil, Speak truth',
        blurb: `Blurb for god ${index + 1}.`,
        is_forgotten: index < 2 ? 'true' : 'false'
      }))
    })
    expect(normalized?.deities).toHaveLength(8)
    expect(normalized?.deities[0]?.domains).toEqual(['war', 'sea'])
    expect(normalized?.deities[0]?.tenets).toEqual(['Keep vigil', 'Speak truth'])
    expect(normalized?.deities.filter((d) => d.isForgotten)).toHaveLength(2)
    expect(isValidGeneratedPantheon(normalized)).toBe(true)
  })
})

describe('buildPantheonGenerationPrompt (059)', () => {
  it('prefers known deities when canon lists them', () => {
    const prompt = buildPantheonGenerationPrompt('world of the shield hero', {
      recognizedSetting: true,
      settingLabel: 'Shield Hero',
      knownPlaces: [],
      knownCharacters: [],
      knownDeities: ['The Three Heroes', 'Ost Hero']
    })
    expect(prompt).toContain('The Three Heroes')
    expect(prompt).toContain('Prefer the known deity')
    expect(prompt).toContain('8–12')
  })
})

describe('buildWorldGenerationPrompt pantheon context (059)', () => {
  it('includes pantheon deity names', () => {
    const prompt = buildWorldGenerationPrompt('A marsh kingdom', {
      pantheonSummary: 'Tide faiths rule the harbors.',
      deities: [
        {
          name: 'Vhalor',
          epithet: 'the Drowned Judge',
          domains: ['tides'],
          tenets: ['Keep oaths', 'Fear the deep'],
          blurb: 'Tide judge.',
          isForgotten: false
        }
      ]
    })
    expect(prompt).toContain('Vhalor')
    expect(prompt).toContain('consistent with the pantheon')
  })
})

describe('formatDeityDigest (059)', () => {
  it('is compact without tenets or blurbs', () => {
    const digest = formatDeityDigest([
      {
        name: 'Vhalor',
        epithet: 'the Drowned Judge',
        domains: ['tides', 'oaths'],
        tenets: ['Keep oaths', 'Fear the deep'],
        blurb: 'Secret blurb text.',
        isForgotten: true
      }
    ])
    expect(digest).toContain('Vhalor, the Drowned Judge — tides, oaths (forgotten)')
    expect(digest).not.toContain('Keep oaths')
    expect(digest).not.toContain('Secret blurb')
  })
})

describe('generateCampaignWorld prose guard', () => {
  it('retries when the model injects kraken without premise support', async () => {
    const badWorld = {
      ...VALID_WORLD,
      worldSummary: `${VALID_WORLD.worldSummary}\n\nA kraken rules the deeps beneath every harbor.`
    }
    const provider = createScriptedProvider([JSON.stringify(badWorld), JSON.stringify(VALID_WORLD)])
    const world = await generateCampaignWorld(provider, 'A quiet farming valley')
    expect(world.worldSummary).not.toMatch(/kraken/i)
  })

  it('retries when the model stacks hyphen compounds in one paragraph', async () => {
    const badWorld = {
      ...VALID_WORLD,
      worldSummary: VORATH_STACKED_SUMMARY
    }
    const provider = createScriptedProvider([JSON.stringify(badWorld), JSON.stringify(VALID_WORLD)])
    const world = await generateCampaignWorld(provider, 'A quiet farming valley')
    expect(findProseJargonViolations(world.worldSummary)).toHaveLength(0)
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
        worldHistory: 'Past one.\n\nTwo.\n\nThree.\n\nFour.\n\nFive.',
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
    expect(fetched?.worldSummary).toContain('Tyria')
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

interface ConcurrencyTrackingProvider extends Provider {
  maxInFlight: () => number
}

/**
 * Scripted provider that records how many generate calls are in flight at
 * once. Responses are assigned in call order (all shortfall-fill calls in a
 * region batch share the same prompt, so order-based assignment is safe).
 */
function createConcurrencyTrackingProvider(responses: ScriptedResponse[]): ConcurrencyTrackingProvider {
  const queue = [...responses]
  let inFlight = 0
  let maxInFlight = 0
  return {
    maxInFlight: () => maxInFlight,
    async generate(): Promise<string> {
      const next = queue.shift()
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await Promise.resolve()
      inFlight -= 1
      if (next === undefined) {
        throw new Error('createConcurrencyTrackingProvider: no more scripted responses queued')
      }
      if (next instanceof Error) {
        throw next
      }
      return next
    }
  }
}

function shortfallNpcPayload(regionName: string, name: string): string {
  return JSON.stringify({ npc: { ...makeNpcs(regionName, 'Fill')[0]!, name } })
}

/** World + one region + all initial NPC slots failing + story, so the shortfall fill owns every slot. */
function buildShortfallSeedPrelude(region: ReturnType<typeof makeRegion>, npcsPerRegion: number): string[] {
  return [
    EMPTY_CANON_RESPONSE,
    VALID_PANTHEON_RESPONSE,
    JSON.stringify(VALID_WORLD),
    JSON.stringify({ regions: [region] }),
    ...Array.from({ length: npcsPerRegion * MAX_GENERATION_ATTEMPTS }, () => 'invalid npc slot response'),
    JSON.stringify({ storyThread: { title: 'Shortfall Arc', state: 'starting', summary: 'Fill the cast.' } })
  ]
}

describe('fillCampaignNpcShortfall parallelism (040.11)', () => {
  it('issues concurrent single-NPC requests capped at 4 in flight', async () => {
    const region = makeRegion('Emberfall Reach', 'ember')
    const fillNames = ['Aldric Snow', 'Bess Marlow', 'Corin Vale', 'Dara Quill', 'Edda Frost', 'Fenn Harrow']
    const provider = createConcurrencyTrackingProvider([
      ...buildShortfallSeedPrelude(region, 6),
      ...fillNames.map((name) => shortfallNpcPayload(region.name, name))
    ])
    const result = await generateCampaignSeed(provider, 'premise', { regionCount: 1, npcsPerRegion: 6 })
    expect(result.npcs).toHaveLength(6)
    expect(new Set(result.npcs.map((npc) => npc.name)).size).toBe(6)
    expect(provider.maxInFlight()).toBeGreaterThan(1)
    expect(provider.maxInFlight()).toBeLessThanOrEqual(4)
  })

  it('detects and regenerates name collisions between concurrently generated NPCs', async () => {
    const region = makeRegion('Gloamwater Fen', 'fen')
    const provider = createScriptedProvider([
      ...buildShortfallSeedPrelude(region, 3),
      shortfallNpcPayload(region.name, 'Duplicate Dara'),
      shortfallNpcPayload(region.name, 'Duplicate Dara'),
      shortfallNpcPayload(region.name, 'Ferris Vale'),
      shortfallNpcPayload(region.name, 'Renata Cole')
    ])
    const result = await generateCampaignSeed(provider, 'premise', { regionCount: 1, npcsPerRegion: 3 })
    const names = result.npcs.map((npc) => npc.name)
    expect(result.npcs).toHaveLength(3)
    expect(new Set(names).size).toBe(3)
    expect(names.filter((name) => name === 'Duplicate Dara')).toHaveLength(1)
    expect(names).toContain('Renata Cole')
  })

  it('keeps successful fills when a single NPC generation fails irrecoverably', async () => {
    const region = makeRegion('Harrowmoor', 'moor')
    const provider = createScriptedProvider([
      ...buildShortfallSeedPrelude(region, 3),
      shortfallNpcPayload(region.name, 'Alba Reed'),
      new Error('provider outage'),
      shortfallNpcPayload(region.name, 'Bryn Holt'),
      // finalizeGenerationResult retries the still-missing slot once more; it fails too
      new Error('provider outage')
    ])
    const result = await generateCampaignSeed(provider, 'premise', { regionCount: 1, npcsPerRegion: 3 })
    expect(result.npcs.map((npc) => npc.name).sort()).toEqual(['Alba Reed', 'Bryn Holt'])
  })
})

/** Phase-1 marker of the flagged two-phase pipeline — must never appear on one-shot paths. */
const CORE_BUNDLE_PROMPT_MARKER = 'core identity bundle'

describe('one-shot NPC generation call-count guards (040.13)', () => {
  it('bulk campaign generation issues exactly one LLM call per NPC', async () => {
    const responses = buildCascadingSeedResponses({ regionCount: 2, npcsPerRegion: 3 })
    const provider = createScriptedProvider(responses)
    const result = await generateCampaignSeed(provider, 'premise', { regionCount: 2, npcsPerRegion: 3 })
    expect(result.npcs).toHaveLength(6)
    // canon + pantheon + world + regions + one call per NPC (6) + story thread = 11
    expect(provider.calls).toHaveLength(11)
    expect(provider.calls.filter((call) => call.prompt.includes(CORE_BUNDLE_PROMPT_MARKER))).toHaveLength(0)
  })

  it('additional-region generation issues a single one-shot call covering region and NPCs', async () => {
    const provider = createScriptedProvider([ADDITIONAL_REGION])
    const result = await generateAdditionalRegion(provider, 'A flooded kingdom.', ['Oakhollow'], {
      seedPrompt: 'A marsh crossing'
    })
    expect(result.npcs).toHaveLength(3)
    expect(provider.calls).toHaveLength(1)
    expect(provider.calls[0]?.prompt).not.toContain(CORE_BUNDLE_PROMPT_MARKER)
  })

  it('shortfall top-up issues exactly one LLM call per topped-up NPC', async () => {
    const region = makeRegion('Topup Vale', 'top')
    const prelude = buildShortfallSeedPrelude(region, 2)
    const provider = createScriptedProvider([
      ...prelude,
      shortfallNpcPayload(region.name, 'Gale North'),
      shortfallNpcPayload(region.name, 'Hollis Reed')
    ])
    const result = await generateCampaignSeed(provider, 'premise', { regionCount: 1, npcsPerRegion: 2 })
    expect(result.npcs).toHaveLength(2)
    expect(provider.calls).toHaveLength(prelude.length + 2)
    expect(provider.calls.filter((call) => call.prompt.includes(CORE_BUNDLE_PROMPT_MARKER))).toHaveLength(0)
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
