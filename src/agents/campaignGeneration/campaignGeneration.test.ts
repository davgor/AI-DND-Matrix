import { describe, expect, it } from 'vitest'
import { createTestDb } from '../../db/testUtils'
import { getCampaignById } from '../../db/repositories/campaigns'
import { listNpcsByRegion } from '../../db/repositories/npcs'
import { listRegionsByCampaign } from '../../db/repositories/regions'
import { listRegionHistoryByRegion } from '../../db/repositories/regionHistory'
import { listStoryThreadsByCampaign } from '../../db/repositories/storyThreads'
import { listQuestHooksByRegion } from '../../db/repositories/worldFacts'
import { createScriptedProvider } from '../providers/mockHarness'
import type { ScriptedResponse } from '../providers/mockHarness'
import type { Provider } from '../providers/types'
import { LlamaCppTruncationError } from '../providers/llamacpp'
import { tryParseJson } from '../jsonResponse'
import { buildAvailableRaceOptions } from '../raceLore'
import {
  CampaignGenerationSchemaError,
  MAX_GENERATION_ATTEMPTS,
  SCHEMA_FAILURE_RAW_LOG_MAX_CHARS,
  formatSchemaFailureAttemptsLog,
  generateAdditionalRegion,
  generateAndPersistCampaign,
  generateCampaignSeed,
  generateCampaignWorld,
  generateSingleNpc,
  resolveInitialGenerationCounts
} from '.'
import {
  buildAdditionalRegionPrompt,
  buildCanonRecallPrompt,
  buildFactionsGenerationPrompt,
  buildPantheonGenerationPrompt,
  buildRegionsGenerationPrompt,
  buildSingleNpcPrompt,
  buildWorldGenerationPrompt,
  formatDeityDigest,
  formatGeneratedFactionDigest,
  formatGeneratedFactionDigestLines
} from './prompts'
import { normalizeAdditionalRegion, normalizeCanonRecall } from './normalize'
import { persistRegionWithNpcs } from './persist'
import {
  hasValidNpcRace,
  hasValidNpcBackground,
  hasValidNpcGender,
  hasValidNpcClass
} from './normalize'

import {
  ADDITIONAL_REGION,
  REALISTIC_LLM_WORLD,
  REALISTIC_LLM_FACTIONS,
  VALID_WORLD,
  VALID_MEDIUM_FACTIONS,
  VALID_FACTIONS_RESPONSE,
  EMPTY_CANON_RESPONSE,
  VALID_PANTHEON_RESPONSE,
  LIVE_SPLIT_WORLD_JSON_DUMP,
  LIVE_MEDIUM_FACTIONS_MISSING_RELIGIOUS_KIND,
  buildCascadingSeedResponses,
  buildShieldHeroCascadingSeedResponses,
  makeBestiarySeedResponse,
  makeNpcs,
  makeRegion,
  RACE_LORE_RESPONSE,
  SETUP_INPUT,
  ADDITIONAL_REGION_PARSED,
  additionalRegionLabeledBlocks,
  regionsLabeledBlocks,
  storyLabeledBlocks,
  singleNpcLabeledBlocks,
  worldLabeledBlocks
} from '../../test/fixtures/campaignGenerationFixtures'
import type { CreateCampaignStage } from '../../shared/campaignCreate/types'
import {
  countParagraphs,
  coerceNpcTemperament,
  hasRepeatedSentences,
  isValidGeneratedFactions,
  isValidGeneratedPantheon,
  isValidGeneratedWorld,
  normalizeGeneratedFactions,
  normalizeGeneratedPantheon,
  normalizeGeneratedWorld,
  normalizeGeneratedNpc,
  normalizeRaceKeyForRoster
} from './normalize'
import { meetsProseJargonStandards } from './proseJargonGuard'

const SPEAKING_STYLE_FIXTURE_RESPONSE = JSON.stringify({
  specimen: "I keep my voice low and my bargains lower — that's how you survive here.",
  examples: ['Coin first, questions later.', 'You want trouble? Try the next stall.']
})

/** Persist-time LLM queue: one race realize (first unique race) + style + combat review per NPC. */
function persistSpeakingNpcResponses(npcCount: number, uniqueRaceCount = 1): string[] {
  return [
    ...Array.from({ length: uniqueRaceCount }, () => RACE_LORE_RESPONSE),
    ...Array.from({ length: npcCount }, () => [
      SPEAKING_STYLE_FIXTURE_RESPONSE,
      '{"upgrade":false}'
    ]).flat()
  ]
}

/** When race lore is already realized (e.g. additional region in existing campaign). */
function persistSpeakingNpcResponsesRaceReady(npcCount: number): string[] {
  return Array.from({ length: npcCount }, () => [
    SPEAKING_STYLE_FIXTURE_RESPONSE,
    '{"upgrade":false}'
  ]).flat()
}

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
})

const BLOB_WORLD_HISTORY_TOPICS = [
  'Titans raised the first ridge walls before mortal kingdoms had names',
  'Forge clans sealed pacts in ore and blood along the high passes',
  'Sword-lords carved marches from the wreck of the Godwrought War',
  'Veiled restorers quieted the passes but left unfinished watchtowers',
  'River seers now dream of maps that rewrite themselves after every storm',
  'Salt merchants bought noble titles with dredged crowns from drowned vaults',
  'Beacon fires went dark when the Compact’s tithe wars emptied the towers',
  'Explorer crews returned with cursed ore and missing manifests',
  'Smuggler princes claim the drowned still vote on every treaty',
  'Festival markets bloom beside famine roads while beacon chains relight too late'
]

function buildSentenceBlobWorld(): {
  worldName: string
  worldSummary: string
  worldHistory: string
} {
  const worldSummary = [
    'Calderin is a highland basin ringed by wind-cut mesas and dry riverbeds.',
    'Caravan towers mark the only reliable wells between the salt flats and the timber line.',
    'Herders still move flocks along the ridge roads each spring.',
    'Toll keepers argue with free riders over which spring belongs to which clan.',
    'Border forts are understaffed after the last raid season.',
    'Everyone knows the next drought will decide who keeps their grazing rights.'
  ].join(' ')
  const worldHistory = BLOB_WORLD_HISTORY_TOPICS.map((topic) => `${topic}.`).join(' ')
  return { worldName: 'Calderin', worldSummary, worldHistory }
}

describe('normalizeGeneratedWorld reshape', () => {
  it('reshapes enough sentences into required paragraphs without inventing filler', () => {
    const blobWorld = buildSentenceBlobWorld()
    const normalized = normalizeGeneratedWorld(blobWorld)
    expect(normalized).toBeDefined()
    expect(isValidGeneratedWorld(normalized)).toBe(true)
    expect(countParagraphs(normalized!.worldSummary)).toBe(3)
    expect(countParagraphs(normalized!.worldHistory)).toBe(5)
    expect(normalized!.worldSummary).toContain('highland basin')
    expect(normalized!.worldHistory).toContain('Titans raised')
    expect(normalized!.worldSummary).not.toMatch(/travelers still tell/i)
  })
})

describe('live local split world JSON dump (020.32)', () => {
  it('still parses the captured two-object Qwen dump via tryParseJson (interim JSON path)', () => {
    const parsed = tryParseJson(LIVE_SPLIT_WORLD_JSON_DUMP)
    const normalized = normalizeGeneratedWorld(parsed)
    expect(normalized?.worldName).toBe('Aetheris')
    expect(normalized?.worldHistory).toContain('Gornath')
    expect(isValidGeneratedWorld(normalized)).toBe(true)
  })

  it('accepts the same world content as labeled blocks through generateCampaignWorld (161.4)', async () => {
    const normalized = normalizeGeneratedWorld(tryParseJson(LIVE_SPLIT_WORLD_JSON_DUMP))
    expect(normalized).toBeDefined()
    const blocks = worldLabeledBlocks({
      worldName: normalized!.worldName,
      worldSummary: normalized!.worldSummary,
      worldHistory: normalized!.worldHistory
    })
    const provider = createScriptedProvider([blocks])
    const world = await generateCampaignWorld(
      provider,
      'The party is hired to investigate strange lights rise from the old quarries at dusk in a ruined monastery ruled by a mercenary company.'
    )
    expect(world.worldName).toBe('Aetheris')
    expect(world.worldSummary.length).toBeGreaterThan(40)
  })
})

describe('normalizeGeneratedFactions: valid fixtures', () => {
  it('accepts camelCase medium fixtures and pressure band counts', () => {
    const normalized = normalizeGeneratedFactions(VALID_MEDIUM_FACTIONS)
    expect(normalized?.factionPressure).toBe('medium')
    expect(normalized?.factions.length).toBeGreaterThanOrEqual(3)
    expect(normalized?.factions.length).toBeLessThanOrEqual(7)
    expect(normalized?.relations.length).toBeGreaterThanOrEqual(2)
    expect(isValidGeneratedFactions(VALID_MEDIUM_FACTIONS, { deitiesPresent: true })).toBe(true)
    expect(normalized?.factions.some((faction) => faction.kind === 'religious')).toBe(true)
  })

  it('accepts snake_case live-model keys', () => {
    const normalized = normalizeGeneratedFactions(REALISTIC_LLM_FACTIONS)
    expect(normalized?.factionPressure).toBe('medium')
    expect(normalized?.factionsSummary).toContain('Caravan leagues')
    expect(normalized?.factions.find((faction) => faction.key === 'temple_of_vhalor')?.deityName).toBe(
      'Vhalor'
    )
    expect(normalized?.relations[0]?.factionAKey).toBe('ashen_caravan_league')
    expect(isValidGeneratedFactions(REALISTIC_LLM_FACTIONS, { deitiesPresent: true })).toBe(true)
  })
})

const OVERSIZED_LIGHT_FACTIONS = {
  faction_pressure: 'light',
  factions_summary: 'Too many blocs for a quiet valley.',
  factions: [
    { key: 'a', name: 'A', kind: 'civic', summary: 'A.', sort_order: 0 },
    { key: 'b', name: 'B', kind: 'mercantile', summary: 'B.', sort_order: 1 },
    { key: 'c', name: 'C', kind: 'criminal', summary: 'C.', sort_order: 2 },
    { key: 'd', name: 'D', kind: 'military', summary: 'D.', sort_order: 3 },
    {
      key: 'temple',
      name: 'Temple',
      kind: 'religious',
      summary: 'Faith.',
      deity_name: 'Vhalor',
      sort_order: 4
    }
  ],
  relations: []
}

describe('normalizeGeneratedFactions: trimming', () => {
  it('trims oversized rosters to band max while preferring religious factions', () => {
    const normalized = normalizeGeneratedFactions(OVERSIZED_LIGHT_FACTIONS)
    expect(normalized?.factions).toHaveLength(4)
    expect(normalized?.factions.some((faction) => faction.kind === 'religious')).toBe(true)
    expect(isValidGeneratedFactions(OVERSIZED_LIGHT_FACTIONS)).toBe(true)
  })

  it('rejects undersized medium rosters when deities exist', () => {
    const thin = {
      factionPressure: 'medium',
      factionsSummary: 'Only two blocs.',
      factions: [
        { key: 'a', name: 'A', kind: 'civic', summary: 'A.' },
        { key: 'b', name: 'B', kind: 'mercantile', summary: 'B.' }
      ],
      relations: [{ factionAKey: 'a', factionBKey: 'b', stance: 'ally' }]
    }
    expect(isValidGeneratedFactions(thin, { deitiesPresent: true })).toBe(false)
  })
})

describe('normalizeGeneratedFactions religious promote (020.33)', () => {
  it('promotes a faith-linked faction to religious when medium pressure and deities exist', () => {
    const noReligiousKind = {
      factionPressure: 'medium',
      factionsSummary: 'Stormbringers and Weavers vie for influence.',
      factions: [
        {
          key: 'stormbringers',
          name: 'Stormbringers',
          kind: 'civic',
          summary: 'Mages who harness storms and bargain with storm gods.',
          deityName: 'Kaelon'
        },
        { key: 'weavers', name: 'Weavers', kind: 'mercantile', summary: 'Trade guilds.' },
        { key: 'hunters', name: 'Hunters', kind: 'military', summary: 'Border patrols.' }
      ],
      relations: [
        { factionAKey: 'stormbringers', factionBKey: 'weavers', stance: 'tense' },
        { factionAKey: 'weavers', factionBKey: 'hunters', stance: 'rival' }
      ]
    }
    const normalized = normalizeGeneratedFactions(noReligiousKind, { deitiesPresent: true })
    expect(normalized?.factions.find((faction) => faction.key === 'stormbringers')?.kind).toBe(
      'religious'
    )
    expect(isValidGeneratedFactions(noReligiousKind, { deitiesPresent: true })).toBe(true)
  })
})

describe('normalizeGeneratedFactions live dump (020.33)', () => {
  it('accepts the live Qwen medium dump after religious-kind coercion', () => {
    expect(
      isValidGeneratedFactions(LIVE_MEDIUM_FACTIONS_MISSING_RELIGIOUS_KIND, {
        deitiesPresent: false
      })
    ).toBe(true)
    const normalized = normalizeGeneratedFactions(LIVE_MEDIUM_FACTIONS_MISSING_RELIGIOUS_KIND, {
      deitiesPresent: true
    })
    expect(normalized?.factions.some((faction) => faction.kind === 'religious')).toBe(true)
    expect(
      isValidGeneratedFactions(LIVE_MEDIUM_FACTIONS_MISSING_RELIGIOUS_KIND, {
        deitiesPresent: true
      })
    ).toBe(true)
  })
})

describe('normalizeGeneratedFactions secular medium (020.33)', () => {
  it('leaves secular medium rosters alone when no deities are present', () => {
    const noFaith = {
      factionPressure: 'medium',
      factionsSummary: 'Secular courts only.',
      factions: [
        { key: 'a', name: 'A', kind: 'civic', summary: 'A.' },
        { key: 'b', name: 'B', kind: 'mercantile', summary: 'B.' },
        { key: 'c', name: 'C', kind: 'criminal', summary: 'C.' }
      ],
      relations: [
        { factionAKey: 'a', factionBKey: 'b', stance: 'rival' },
        { factionAKey: 'b', factionBKey: 'c', stance: 'tense' }
      ]
    }
    expect(isValidGeneratedFactions(noFaith, { deitiesPresent: false })).toBe(true)
    expect(
      normalizeGeneratedFactions(noFaith, { deitiesPresent: false })?.factions.every(
        (faction) => faction.kind !== 'religious'
      )
    ).toBe(true)
  })
})

describe('normalizeGeneratedWorld continued', () => {
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

describe('normalizeGeneratedNpc temperament and race', () => {
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

describe('normalizeGeneratedNpc appearance fields', () => {
  it('defaults optional appearance fields to null', () => {
    const withoutAppearance = normalizeGeneratedNpc({
      name: 'Mara',
      role: 'scout',
      disposition: 'wary',
      regionName: 'Pass',
      temperament: 'neutral',
      canSpeak: true,
      alignment: 'neutral_good',
      race: 'human',
      background: 'folk_hero',
      gender: 'woman',
      class: 'commoner',
      backstory: 'Mara grew up in the pass.'
    })
    expect(withoutAppearance?.hairColor).toBeNull()
    expect(withoutAppearance?.age).toBeNull()
    expect(withoutAppearance?.eyeColor).toBeNull()
  })

  it('coerces and trims optional appearance fields when provided', () => {
    const withAppearance = normalizeGeneratedNpc({
      name: 'Mara',
      role: 'scout',
      disposition: 'wary',
      regionName: 'Pass',
      temperament: 'neutral',
      canSpeak: true,
      alignment: 'neutral_good',
      race: 'human',
      background: 'folk_hero',
      gender: 'woman',
      class: 'commoner',
      backstory: 'Mara grew up in the pass.',
      hairColor: '  auburn ',
      age: 'young adult',
      eyeColor: 'green'
    })
    expect(withAppearance?.hairColor).toBe('auburn')
    expect(withAppearance?.age).toBe('young adult')
    expect(withAppearance?.eyeColor).toBe('green')
  })
})

describe('normalizeGeneratedNpc faction membership (125.4)', () => {
  const baseSpeaking = {
    name: 'Mara',
    role: 'acolyte',
    disposition: 'devout',
    regionName: 'Pass',
    temperament: 'disciplined',
    canSpeak: true,
    alignment: 'lawful_good',
    race: 'human',
    background: 'acolyte',
    gender: 'woman',
    class: 'cleric',
    backstory: 'Mara tends the shrine.'
  }

  it('keeps optional factionKey and membershipRole', () => {
    const npc = normalizeGeneratedNpc({
      ...baseSpeaking,
      factionKey: 'temple_of_vhalor',
      membershipRole: 'acolyte'
    })
    expect(npc?.factionKey).toBe('temple_of_vhalor')
    expect(npc?.membershipRole).toBe('acolyte')
  })

  it('accepts snake_case aliases without invalidating the NPC', () => {
    const npc = normalizeGeneratedNpc({
      ...baseSpeaking,
      faction_key: 'harbor_council',
      faction_membership_role: 'clerk'
    })
    expect(npc?.factionKey).toBe('harbor_council')
    expect(npc?.membershipRole).toBe('clerk')
  })

  it('keeps unknown faction keys on the generated shape (persist drops them)', () => {
    const npc = normalizeGeneratedNpc({
      ...baseSpeaking,
      factionKey: 'not_a_real_faction',
      membershipRole: 'spy'
    })
    expect(npc).toBeDefined()
    expect(npc?.factionKey).toBe('not_a_real_faction')
    expect(npc?.membershipRole).toBe('spy')
  })
})

describe('formatGeneratedFactionDigest (125.4)', () => {
  it('emits slim key/name/kind lines with deity names and caps at slim max', () => {
    const digest = formatGeneratedFactionDigest(VALID_MEDIUM_FACTIONS.factions)
    expect(digest).toContain('temple_of_vhalor: Temple of Vhalor [religious]')
    expect(digest).toContain('deity:Vhalor')
    expect(digest).toContain('harbor_council: Harbor Council [civic]')
    expect(digest).not.toContain('Port magistrates who tax')
  })

  it('adds clergy bias wording for medium/heavy pressure', () => {
    const lines = formatGeneratedFactionDigestLines(VALID_MEDIUM_FACTIONS.factions, {
      factionPressure: 'medium'
    })
    const joined = lines.join('\n')
    expect(joined).toContain('temple_of_vhalor')
    expect(joined.toLowerCase()).toMatch(/clergy|acolyte|priest|inquisitor|cultist/)
    expect(joined.toLowerCase()).toMatch(/religious/)
  })

  it('omits clergy bias for light pressure without religious factions', () => {
    const lines = formatGeneratedFactionDigestLines(
      [
        {
          key: 'vale_watch',
          name: 'Vale Watch',
          kind: 'civic',
          summary: 'Local militia.'
        }
      ],
      { factionPressure: 'light' }
    )
    const joined = lines.join('\n').toLowerCase()
    expect(joined).not.toMatch(/acolyte|priest|inquisitor|cultist/)
  })
})

describe('buildSingleNpcPrompt faction roster (125.4)', () => {
  it('includes slim faction digest and optional membership fields', () => {
    const prompt = buildSingleNpcPrompt({
      campaignPremise: 'A harbor intrigue.',
      regionName: 'Tidemark Reach',
      regionDescription: 'A battered harbor.',
      existingNpcNames: [],
      seedPrompt: 'A tide priest',
      availableRaces: buildAvailableRaceOptions([]),
      factions: VALID_MEDIUM_FACTIONS
    })
    expect(prompt).toContain('temple_of_vhalor')
    expect(prompt).toContain('deity:Vhalor')
    expect(prompt).toContain('factionKey')
    expect(prompt).toContain('membershipRole')
    expect(prompt.toLowerCase()).toMatch(/clergy|acolyte|priest/)
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
      worldLabeledBlocks(VALID_WORLD),
      VALID_FACTIONS_RESPONSE,
      regionsLabeledBlocks(regions),
      singleNpcLabeledBlocks('Ashen Crown Bazaar', firstNpc),
      singleNpcLabeledBlocks('Ashen Crown Bazaar', duplicateNpc),
      singleNpcLabeledBlocks('Ashen Crown Bazaar', uniqueNpc),
      makeBestiarySeedResponse(),
      storyLabeledBlocks({ title: 'Arc', summary: 'S' })
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
    expect(stages).toContain('factions')
    expect(stages.indexOf('factions')).toBeGreaterThan(stages.indexOf('world'))
    expect(stages.indexOf('regions')).toBeGreaterThan(stages.indexOf('factions'))
    expect(stages).toContain('regions')
    expect(stages.filter((stage) => stage === 'npcs').length).toBeGreaterThanOrEqual(2)
    expect(stages).toContain('bestiary')
    expect(stages.indexOf('bestiary')).toBeGreaterThan(stages.lastIndexOf('npcs'))
    expect(stages).toContain('story')
    expect(stages.indexOf('story')).toBeGreaterThan(stages.indexOf('bestiary'))
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
    const foeNames = result.bestiary.foes.map((foe) => foe.name.toLowerCase()).join(' ')
    const foeTags = result.bestiary.foes.flatMap((foe) => foe.tags ?? []).join(' ').toLowerCase()
    expect(foeNames.includes('slime') || foeTags.includes('slime')).toBe(true)
    expect(foeNames.includes('rift') || foeTags.includes('rift')).toBe(true)
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
    expect(result.bestiary.foes.length).toBeGreaterThanOrEqual(3)
    expect(result.bestiary.foes.every((foe) => foe.lore.trim().length > 0)).toBe(true)
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

describe('buildFactionsGenerationPrompt skeleton fill (161.3)', () => {
  it('does not require raw JSON from the model', () => {
    const prompt = buildFactionsGenerationPrompt(
      'A desert caravan city.',
      {
        worldName: 'Eldermere',
        worldSummary: 'Desert caravans.',
        worldHistory: 'Old dunes.'
      },
      {
        pantheonSummary: 'Tide and ash gods.',
        deities: [
          {
            name: 'Vhalor',
            epithet: '',
            domains: ['tides'],
            tenets: ['Keep oaths'],
            blurb: 'A tide judge.',
            isForgotten: false
          }
        ]
      }
    )
    expect(prompt).not.toContain('Respond ONLY with a single JSON object')
    expect(prompt).toContain('Do NOT emit JSON')
    expect(prompt).toContain('{{FACTIONS_SUMMARY}}')
    expect(prompt).toContain('<<<TOKEN>>>')
  })
})

describe('buildWorldGenerationPrompt', () => {
  it('asks for world name, summary, and history only', () => {
    const prompt = buildWorldGenerationPrompt('A marsh kingdom')
    expect(prompt).toContain('worldName')
    expect(prompt).toContain('{{WORLD_NAME}}')
    expect(prompt).toContain('science fiction')
    expect(prompt).toContain('five paragraphs')
    expect(prompt).toContain('two full sentences')
    expect(prompt).toContain('Do NOT emit JSON')
    expect(prompt).toContain('{{WORLD_NAME}}')
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
    expect(prompt).toContain('Do NOT emit JSON')
    expect(prompt).toContain('{{PANTHEON_SUMMARY}}')
    expect(prompt).toContain('{{DEITY_0_NAME}}')
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
    const provider = createScriptedProvider([worldLabeledBlocks(badWorld), worldLabeledBlocks(VALID_WORLD)])
    const world = await generateCampaignWorld(provider, 'A quiet farming valley')
    expect(world.worldSummary).not.toMatch(/kraken/i)
  })

  it('retries when the model stacks hyphen compounds in one paragraph', async () => {
    const badWorld = {
      ...VALID_WORLD,
      worldSummary: VORATH_STACKED_SUMMARY
    }
    const provider = createScriptedProvider([worldLabeledBlocks(badWorld), worldLabeledBlocks(VALID_WORLD)])
    const world = await generateCampaignWorld(provider, 'A quiet farming valley')
    expect(meetsProseJargonStandards(world.worldSummary)).toBe(true)
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

  it('does not restart the full seed when a stage hits output truncation', async () => {
    const calls: string[] = []
    const provider: Provider = {
      async generate(prompt: string): Promise<string> {
        calls.push(prompt)
        throw new LlamaCppTruncationError('truncated at max_tokens')
      }
    }
    await expect(generateCampaignSeed(provider, 'x', { regionCount: 1, npcsPerRegion: 1 })).rejects.toBeInstanceOf(
      LlamaCppTruncationError
    )
    // Canon truncates up to MAX_GENERATION_ATTEMPTS, then aborts — no ×5 outer restart.
    expect(calls.length).toBe(MAX_GENERATION_ATTEMPTS)
  })
})

describe('generateCampaignSeed world schema fail-fast (020.30)', () => {
  it('does not restart the full seed when world schema fails after stage retries', async () => {
    const calls: string[] = []
    const provider: Provider = {
      async generate(prompt: string): Promise<string> {
        calls.push(prompt)
        if (prompt.includes('knownPlaces') || prompt.includes('recognizedSetting')) {
          return EMPTY_CANON_RESPONSE
        }
        if (prompt.includes('pantheonSummary') || prompt.includes('isForgotten')) {
          return VALID_PANTHEON_RESPONSE
        }
        return 'not a valid world payload'
      }
    }
    await expect(
      generateCampaignSeed(provider, 'A quiet farming valley', { regionCount: 1, npcsPerRegion: 1 })
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof CampaignGenerationSchemaError && /valid world schema/i.test(error.message)
    )
    // canon + pantheon + world×3 — not ×5 full seed restarts.
    expect(calls.length).toBe(2 + MAX_GENERATION_ATTEMPTS)
  })
})

describe('generateWithRetries schema failure diagnostics (020.31)', () => {
  it('attaches truncated raw responses and reasons to CampaignGenerationSchemaError', async () => {
    const huge = `not-json-${'x'.repeat(5000)}`
    const missingBlocks = ['<<<WORLD_NAME>>>', 'OnlyName', '<<</WORLD_NAME>>>'].join('\n')
    const provider = createScriptedProvider(['not json at all', missingBlocks, huge])
    let caught: unknown
    try {
      await generateCampaignWorld(provider, 'A quiet farming valley')
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(CampaignGenerationSchemaError)
    const schemaError = caught as CampaignGenerationSchemaError
    expect(schemaError.failedAttempts).toHaveLength(MAX_GENERATION_ATTEMPTS)
    expect(schemaError.failedAttempts[0]).toMatchObject({
      attempt: 1,
      reason: 'unparseable',
      raw: 'not json at all'
    })
    expect(schemaError.failedAttempts[1]).toMatchObject({
      attempt: 2,
      reason: 'unparseable'
    })
    expect(schemaError.failedAttempts[2]?.reason).toBe('unparseable')
    expect(schemaError.failedAttempts[2]?.raw.length).toBeLessThanOrEqual(
      SCHEMA_FAILURE_RAW_LOG_MAX_CHARS + 40
    )
    expect(schemaError.failedAttempts[2]?.raw).toContain('[truncated')
  })

  it('formats schema failure attempts for the main log', () => {
    const error = new CampaignGenerationSchemaError('DM agent did not return a valid world schema after retries', [
      { attempt: 1, reason: 'unparseable', raw: 'nope' },
      { attempt: 2, reason: 'invalid', raw: '{"worldName":"X"}' }
    ])
    const formatted = formatSchemaFailureAttemptsLog(error)
    expect(formatted).toContain('valid world schema')
    expect(formatted).toContain('reason=unparseable')
    expect(formatted).toContain('nope')
    expect(formatted).toContain('reason=invalid')
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

  it('accepts human-readable alignment labels from labeled blocks', async () => {
    const region = makeRegion('Ashmere Ossuary', 'death')
    const npcs = makeNpcs('Ashmere Ossuary', 'Ash').map((npc) => ({
      ...npc,
      alignment: 'True Neutral',
      temperament: 'Cautious'
    }))
    const provider = createScriptedProvider([additionalRegionLabeledBlocks(region, npcs)])
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
    const region = makeRegion('Silent Moor', 'fog')
    const provider = createScriptedProvider([additionalRegionLabeledBlocks(region, [])])
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
    const payload = singleNpcLabeledBlocks('Oakhollow', {
      name: 'Rook Vale',
      role: 'hermit',
      backstory: 'Rook keeps to the fog.',
      disposition: 'gruff',
      temperament: 'cautious',
      alignment: 'true_neutral',
      race: 'human',
      background: 'hermit',
      gender: 'unspecified',
      class: 'commoner'
    })
    const provider = createScriptedProvider([payload, SPEAKING_STYLE_FIXTURE_RESPONSE])
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
    const provider = createScriptedProvider([...seedResponses, ...persistSpeakingNpcResponses(6)])

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
    const provider = createScriptedProvider([...seedResponses, ...persistSpeakingNpcResponses(6)])
    const campaign = await generateAndPersistCampaign(db, provider, SETUP_INPUT)
    const additional = ADDITIONAL_REGION_PARSED
    const reviewProvider = createScriptedProvider([...persistSpeakingNpcResponsesRaceReady(3)])
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
  return singleNpcLabeledBlocks(regionName, { ...makeNpcs(regionName, 'Fill')[0]!, name })
}

/** World + one region + all initial NPC slots failing + story, so the shortfall fill owns every slot. */
function buildShortfallSeedPrelude(region: ReturnType<typeof makeRegion>, npcsPerRegion: number): string[] {
  return [
    EMPTY_CANON_RESPONSE,
    VALID_PANTHEON_RESPONSE,
    worldLabeledBlocks(VALID_WORLD),
    VALID_FACTIONS_RESPONSE,
    regionsLabeledBlocks([region]),
    ...Array.from({ length: npcsPerRegion * MAX_GENERATION_ATTEMPTS }, () => 'invalid npc slot response'),
    makeBestiarySeedResponse(),
    storyLabeledBlocks({ title: 'Shortfall Arc', summary: 'Fill the cast.' })
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
    // canon + pantheon + world + factions + regions + one call per NPC (6) + bestiary + story = 13
    expect(provider.calls).toHaveLength(13)
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
    const provider = createScriptedProvider(['not json', ...valid, ...persistSpeakingNpcResponses(6)])

    await generateAndPersistCampaign(db, provider, SETUP_INPUT)

    const campaigns = db.prepare('SELECT id FROM campaigns').all() as Array<{ id: string }>
    expect(campaigns).toHaveLength(1)
    const campaign = getCampaignById(db, campaigns[0]!.id)
    expect(listRegionsByCampaign(db, campaign!.id)).toHaveLength(2)
    expect(listStoryThreadsByCampaign(db, campaign!.id)).toHaveLength(1)
  })
})
