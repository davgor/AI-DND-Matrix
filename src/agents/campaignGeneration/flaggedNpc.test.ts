import { describe, expect, it } from 'vitest'
import { createCampaign } from '../../db/repositories/campaigns'
import {
  createCampaignRace,
  getCampaignRaceByKey
} from '../../db/repositories/campaignRaces'
import { createRegion } from '../../db/repositories/regions'
import {
  ELF_LOREKEEPER_CORE,
  ELF_LOREKEEPER_FINAL,
  ELF_SCOUT_CORE,
  ELF_SCOUT_FINAL
} from '../../db/npcCoreBundleFixtures'
import { createTestDb } from '../../db/testUtils'
import { GENDER_ROSTER } from '../../shared/npcGender/types'
import { NPC_CLASS_ROSTER } from '../../shared/npcClass/types'
import { buildAvailableRaceOptions } from '../raceLore'
import { AGENT_JSON_CONTRACT_SYSTEM } from '../sharedSystemPrompts'
import {
  buildFlaggedNpcFinalPrompt,
  buildNpcCoreBundlePrompt,
  generateFlaggedNpc,
  generateFlaggedNpcDetails,
  generateNpcCoreBundle
} from './flaggedNpc'
import { RACE_LORE_RESPONSE } from '../../test/fixtures/campaignGenerationFixtures'
import { createScriptedProvider } from '../providers/mockHarness'
import { CampaignGenerationSchemaError, type NpcCoreBundle } from './types'

const SAMPLE_LORE = {
  summary: 'Humans are widespread settlers.',
  appearance: 'Varied build and coloring.',
  culture: 'Ambitious and adaptable.',
  roleInThisLand: 'They run the harbor guilds.',
  hooks: ['A human captain seeks lost charts.']
}

const SPEAKING_BUNDLE: NpcCoreBundle = {
  canSpeak: true,
  temperament: 'cautious',
  raceKey: 'human',
  genderKey: 'man',
  alignment: 'lawful_neutral',
  classKey: 'soldier',
  backgroundKey: 'soldier'
}

describe('buildNpcCoreBundlePrompt (052.5)', () => {
  it('includes race, gender, class, and background rosters', () => {
    const prompt = buildNpcCoreBundlePrompt({
      regionName: 'Harbor',
      regionDescription: 'A salt port.',
      seedPrompt: 'A grizzled veteran',
      availableRaces: buildAvailableRaceOptions([]),
      availableGenders: GENDER_ROSTER,
      availableClasses: NPC_CLASS_ROSTER
    })
    expect(prompt).toContain('no name, role, disposition, or backstory')
    expect(prompt).toContain('soldier: Soldier')
    expect(prompt).toContain('man: Man')
    expect(prompt).toContain('folk_hero: Folk Hero')
  })
})

describe('generateNpcCoreBundle (052.5 + 051.4)', () => {
  it('validates all identity fields when canSpeak is true', async () => {
    const payload = JSON.stringify({
      canSpeak: true,
      temperament: 'cautious',
      race: 'human',
      gender: 'man',
      alignment: 'lawful_neutral',
      class: 'fighter',
      background: 'soldier'
    })
    const provider = createScriptedProvider([payload])
    const bundle = await generateNpcCoreBundle(provider, {
      regionName: 'Harbor',
      regionDescription: 'A salt port.',
      seedPrompt: 'A grizzled veteran',
      availableRaces: buildAvailableRaceOptions([])
    })
    expect(bundle.backgroundKey).toBe('soldier')
    expect(bundle.genderKey).toBe('man')
  })

  it('omits identity fields when canSpeak is false', async () => {
    const payload = JSON.stringify({
      canSpeak: false,
      temperament: 'aggressive',
      race: 'human',
      gender: 'man'
    })
    const provider = createScriptedProvider([payload])
    const bundle = await generateNpcCoreBundle(provider, {
      regionName: 'Wilds',
      regionDescription: 'Deep forest.',
      seedPrompt: 'A hostile dire wolf',
      availableRaces: buildAvailableRaceOptions([])
    })
    expect(bundle.canSpeak).toBe(false)
    expect(bundle.raceKey).toBeUndefined()
    expect(bundle.backgroundKey).toBeUndefined()
  })
})

const NON_SPEAKING_BUNDLE_PAYLOAD = JSON.stringify({
  canSpeak: false,
  temperament: 'aggressive',
  race: 'human',
  gender: 'man'
})

const CORE_BUNDLE_INPUT = {
  regionName: 'Wilds',
  regionDescription: 'Deep forest.',
  seedPrompt: 'A hostile dire wolf',
  availableRaces: buildAvailableRaceOptions([])
}

describe('generateNpcCoreBundle GenerateContext (040.1 + 040.13)', () => {
  it('caps phase 1 at the structured-JSON band, not the prose band', async () => {
    const provider = createScriptedProvider([NON_SPEAKING_BUNDLE_PAYLOAD])
    await generateNpcCoreBundle(provider, CORE_BUNDLE_INPUT)
    expect(provider.calls[0]?.context?.maxTokens).toBe(384)
  })

  it('sends the JSON contract via systemPrompt, not the user prompt', async () => {
    const provider = createScriptedProvider([NON_SPEAKING_BUNDLE_PAYLOAD])
    await generateNpcCoreBundle(provider, CORE_BUNDLE_INPUT)
    const call = provider.calls[0]
    expect(call?.context?.systemPrompt).toContain(AGENT_JSON_CONTRACT_SYSTEM)
    expect(call?.context?.systemPrompt).toContain('"canSpeak":boolean')
    expect(call?.prompt).not.toContain('Respond ONLY with JSON')
  })

  it('passes the identical context object on every schema-retry attempt', async () => {
    const provider = createScriptedProvider(['not json', NON_SPEAKING_BUNDLE_PAYLOAD])
    await generateNpcCoreBundle(provider, CORE_BUNDLE_INPUT)
    expect(provider.calls).toHaveLength(2)
    expect(provider.calls[1]?.context).toBe(provider.calls[0]?.context)
  })
})

function expectSpeakingDetailsSystemPrompt(systemPrompt: string | undefined): void {
  expect(systemPrompt).toContain(AGENT_JSON_CONTRACT_SYSTEM)
  expect(systemPrompt).toContain('"backstory":string')
  expect(systemPrompt).toContain('factionKey')
  expect(systemPrompt).toContain('membershipRole')
  expect(systemPrompt).toContain('two short paragraphs')
}

function expectSpeakingGenerateContext(call: { context?: { maxTokens?: number; systemPrompt?: string }; prompt?: string } | undefined): void {
  expect(call?.context?.maxTokens).toBe(4096)
  expectSpeakingDetailsSystemPrompt(call?.context?.systemPrompt)
  expect(call?.prompt).not.toContain('Respond ONLY with JSON')
}

describe('generateFlaggedNpcDetails GenerateContext (040.13)', () => {
  const detailsInput = {
    regionName: 'Harbor',
    regionDescription: 'A salt port.',
    regionHistory: [],
    seedPrompt: 'A grizzled veteran',
    existingNpcNames: []
  }

  it('sends the speaking schema and backstory rule via systemPrompt with the prose cap', async () => {
    const provider = createScriptedProvider([ELF_SCOUT_FINAL])
    await generateFlaggedNpcDetails(provider, { ...detailsInput, bundle: SPEAKING_BUNDLE })
    expectSpeakingGenerateContext(provider.calls[0])
  })

  it('sends the non-speaking schema (no backstory) via systemPrompt', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({ name: 'Grayfang', role: 'dire wolf', disposition: 'Snarls.' })
    ])
    await generateFlaggedNpcDetails(provider, {
      ...detailsInput,
      bundle: { canSpeak: false, temperament: 'aggressive' }
    })
    const call = provider.calls[0]
    expect(call?.context?.systemPrompt).toContain('"name":string')
    expect(call?.context?.systemPrompt).toContain('factionKey')
    expect(call?.context?.systemPrompt).not.toContain('"backstory":string')
    expect(call?.context?.systemPrompt).toContain('Omit backstory entirely')
  })
})

describe('buildFlaggedNpcFinalPrompt speaking NPCs (052.6 + 051.5)', () => {
  it('includes full race lore, region history, and background grounding when the NPC speaks', () => {
    const prompt = buildFlaggedNpcFinalPrompt({
      regionName: 'Harbor',
      regionDescription: 'A salt port.',
      regionHistory: ['The docks burned last winter.'],
      seedPrompt: 'A grizzled veteran running the tavern',
      existingNpcNames: ['Mira'],
      bundle: SPEAKING_BUNDLE,
      raceLabel: 'Human',
      raceLore: SAMPLE_LORE,
      genderBlurb: 'Uses he/him pronouns.',
      classBlurb: 'Trained melee combatant, disciplined with weapons and armor.',
      backgroundLabel: 'Soldier',
      backgroundDescription:
        'You served in an army or militia — drilled, marched, and fought. Discipline, rank, and old comrades (or old enemies) follow you still.'
    })
    expect(prompt).toContain('The docks burned last winter.')
    expect(prompt).toContain('Role in this land: They run the harbor guilds.')
    expect(prompt).toContain('Uses he/him pronouns.')
    expect(prompt).toContain('Background (Soldier):')
    expect(prompt).toContain('Let the backstory reflect this background')
  })
})

describe('buildFlaggedNpcFinalPrompt non-speaking and factions', () => {
  it('omits identity grounding when canSpeak is false', () => {
    const prompt = buildFlaggedNpcFinalPrompt({
      regionName: 'Wilds',
      regionDescription: 'Deep forest.',
      regionHistory: [],
      seedPrompt: 'A hostile dire wolf',
      existingNpcNames: [],
      bundle: { canSpeak: false, temperament: 'aggressive' }
    })
    expect(prompt).not.toContain('Established identity facts')
    // The backstory-omission rule rides in systemPrompt since 040.13 (see
    // 'generateFlaggedNpcDetails GenerateContext' above), not the user prompt.
    expect(prompt).not.toContain('omit backstory entirely')
  })

  it('includes faction digest and clergy bias when pressure is medium (125.4)', () => {
    const prompt = buildFlaggedNpcFinalPrompt({
      regionName: 'Harbor',
      regionDescription: 'A salt port.',
      regionHistory: [],
      seedPrompt: 'A tide priest',
      existingNpcNames: [],
      bundle: SPEAKING_BUNDLE,
      factionDigestLines: [
        'Campaign factions (use factionKey from this roster when binding membership):',
        'temple_of_vhalor: Temple of Vhalor [religious] — deity:Vhalor',
        'When factionPressure is medium/heavy or the world is faith-forward, prefer religious factions for acolyte, priest, inquisitor, or cultist roles.'
      ]
    })
    expect(prompt).toContain('temple_of_vhalor')
    expect(prompt).toContain('deity:Vhalor')
    expect(prompt.toLowerCase()).toMatch(/acolyte|priest|inquisitor|cultist/)
  })
})

const SAMPLE_CAMPAIGN_RACE_LORE = {
  summary: 'Elves are long-lived wardens of the deep woods.',
  appearance: 'Slight, sharp-eared, and quick.',
  culture: 'Bound to grove oaths and old songs.',
  roleInThisLand: 'They watch the frontier treelines.',
  hooks: ['An elven warden seeks a lost heirloom.']
}

const SPEAKING_STYLE_RESPONSE = JSON.stringify({
  specimen:
    "I move quiet through the trees. That's how you stay alive out here — no grand speeches, just work.",
  examples: ["Tracks don't lie.", "I'll scout ahead.", 'Keep your voice down.']
})

const NON_SPEAKING_CORE = JSON.stringify({
  canSpeak: false,
  temperament: 'aggressive'
})

const NON_SPEAKING_FINAL = JSON.stringify({
  name: 'Grayfang',
  role: 'dire wolf',
  disposition: 'Snarls at intruders.'
})

const RAPHTALIA_CORE = JSON.stringify({
  canSpeak: true,
  temperament: 'cautious',
  race: 'demi_human',
  gender: 'woman',
  alignment: 'lawful_good',
  class: 'fighter',
  background: 'outlander'
})

const RAPHTALIA_FINAL = JSON.stringify({
  name: 'Raphtalia',
  role: 'companion',
  disposition: 'Loyal and watchful.',
  backstory: 'A demi-human fighter bound to protect the party.'
})

function setupFlaggedNpcCampaign() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Flagged NPC Budget',
    premisePrompt: 'A frontier town.',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Oakhollow',
    description: 'A logging village.'
  })
  return { db, campaign, region }
}

function flaggedNpcInput(campaignId: string, region: { id: string; name: string; description: string }) {
  return {
    campaignId,
    regionId: region.id,
    regionName: region.name,
    regionDescription: region.description,
    seedPrompt: 'An elven scout',
    existingNpcNames: []
  }
}

describe('generateFlaggedNpc call-count ceilings (040.13 + 092.4)', () => {
  it('issues exactly 3 provider calls when the chosen race is already realized', async () => {
    const { db, campaign, region } = setupFlaggedNpcCampaign()
    createCampaignRace(db, {
      campaignId: campaign.id,
      raceKey: 'elf',
      kind: 'preset',
      label: 'Elf',
      seedPrompt: 'Forest folk.',
      lore: SAMPLE_CAMPAIGN_RACE_LORE,
      createdByCharacterId: null
    })
    const provider = createScriptedProvider([ELF_SCOUT_CORE, ELF_SCOUT_FINAL, SPEAKING_STYLE_RESPONSE])
    const result = await generateFlaggedNpc(db, provider, flaggedNpcInput(campaign.id, region))
    expect(provider.calls).toHaveLength(3)
    expect(result.npc.name).toBe('Sylwen')
    expect(result.npc.raceKey).toBe('elf')
  })

  it('issues exactly 4 provider calls when the chosen race is not yet realized', async () => {
    const { db, campaign, region } = setupFlaggedNpcCampaign()
    const provider = createScriptedProvider([
      ELF_SCOUT_CORE,
      RACE_LORE_RESPONSE,
      ELF_SCOUT_FINAL,
      SPEAKING_STYLE_RESPONSE
    ])
    const result = await generateFlaggedNpc(db, provider, flaggedNpcInput(campaign.id, region))
    expect(provider.calls).toHaveLength(4)
    expect(result.npc.name).toBe('Sylwen')
    expect(getCampaignRaceByKey(db, campaign.id, 'elf')).toBeDefined()
  })
})

describe('phase-2 failure keeps the realized campaign race (040.13, data-integrity item 12)', () => {
  it('leaves the campaign_races row in place and the next NPC of that race reuses it', async () => {
    const { db, campaign, region } = setupFlaggedNpcCampaign()
    const failingProvider = createScriptedProvider([
      ELF_SCOUT_CORE,
      RACE_LORE_RESPONSE,
      'not json',
      'not json',
      'not json'
    ])
    await expect(
      generateFlaggedNpc(db, failingProvider, flaggedNpcInput(campaign.id, region))
    ).rejects.toBeInstanceOf(CampaignGenerationSchemaError)
    expect(getCampaignRaceByKey(db, campaign.id, 'elf')).toBeDefined()

    // The orphaned row is intentional: the next NPC of the same race
    // short-circuits the lore call, so the retry costs 2 calls, not 3.
    const retryProvider = createScriptedProvider([
      ELF_LOREKEEPER_CORE,
      ELF_LOREKEEPER_FINAL,
      SPEAKING_STYLE_RESPONSE
    ])
    const result = await generateFlaggedNpc(db, retryProvider, {
      ...flaggedNpcInput(campaign.id, region),
      seedPrompt: 'An elven lorekeeper'
    })
    expect(retryProvider.calls).toHaveLength(3)
    expect(result.npc.name).toBe('Therin')
  })
})

describe('generateFlaggedNpc speaking style — speakers', () => {
  it('attaches specimen and 2–3 examples for speaking NPCs', async () => {
    const { db, campaign, region } = setupFlaggedNpcCampaign()
    createCampaignRace(db, {
      campaignId: campaign.id,
      raceKey: 'elf',
      kind: 'preset',
      label: 'Elf',
      seedPrompt: 'Forest folk.',
      lore: SAMPLE_CAMPAIGN_RACE_LORE,
      createdByCharacterId: null
    })
    const provider = createScriptedProvider([ELF_SCOUT_CORE, ELF_SCOUT_FINAL, SPEAKING_STYLE_RESPONSE])
    const result = await generateFlaggedNpc(db, provider, flaggedNpcInput(campaign.id, region))
    expect(result.npc.speakingStyleSpecimen).toBeTruthy()
    expect(result.npc.speakingStyleExamples).toHaveLength(3)
    expect(result.npc.speakingStyleExamples!.every((line) => line.length > 0)).toBe(true)
  })
})

describe('generateFlaggedNpc speaking style — non-speakers', () => {
  it('leaves speaking style null for non-speaking creatures', async () => {
    const { db, campaign, region } = setupFlaggedNpcCampaign()
    const provider = createScriptedProvider([NON_SPEAKING_CORE, NON_SPEAKING_FINAL])
    const result = await generateFlaggedNpc(db, provider, {
      ...flaggedNpcInput(campaign.id, region),
      seedPrompt: 'A hostile dire wolf'
    })
    expect(provider.calls).toHaveLength(2)
    expect(result.npc.canSpeak).toBe(false)
    expect(result.npc.speakingStyleSpecimen).toBeUndefined()
    expect(result.npc.speakingStyleExamples).toBeUndefined()
  })
})

describe('generateFlaggedNpc speaking style — fandom hints', () => {
  it('includes fandom-matching instructions when seed names a known character', async () => {
    const { db, campaign, region } = setupFlaggedNpcCampaign()
    createCampaignRace(db, {
      campaignId: campaign.id,
      raceKey: 'demi_human',
      kind: 'custom',
      label: 'Demi-Human',
      seedPrompt: 'Beastfolk.',
      lore: SAMPLE_CAMPAIGN_RACE_LORE,
      createdByCharacterId: null
    })
    const provider = createScriptedProvider([
      RAPHTALIA_CORE,
      RAPHTALIA_FINAL,
      SPEAKING_STYLE_RESPONSE
    ])
    await generateFlaggedNpc(db, provider, {
      ...flaggedNpcInput(campaign.id, region),
      seedPrompt: 'Create Raphtalia as a loyal companion',
      knownCharacters: ['Raphtalia', 'Naofumi Iwatani'],
      settingLabel: 'The Rising of the Shield Hero'
    })
    const stylePrompt = provider.calls[2]?.prompt ?? ''
    expect(stylePrompt).toContain('Raphtalia')
    expect(stylePrompt).toContain('The Rising of the Shield Hero')
    expect(stylePrompt.toLowerCase()).toMatch(/recognizable speech|fandom|source material/)
  })
})

describe('generateFlaggedNpc speaking style — generic seeds', () => {
  it('uses identity-only grounding for a generic seed without knownCharacters', async () => {
    const { db, campaign, region } = setupFlaggedNpcCampaign()
    createCampaignRace(db, {
      campaignId: campaign.id,
      raceKey: 'elf',
      kind: 'preset',
      label: 'Elf',
      seedPrompt: 'Forest folk.',
      lore: SAMPLE_CAMPAIGN_RACE_LORE,
      createdByCharacterId: null
    })
    const provider = createScriptedProvider([ELF_SCOUT_CORE, ELF_SCOUT_FINAL, SPEAKING_STYLE_RESPONSE])
    await generateFlaggedNpc(db, provider, flaggedNpcInput(campaign.id, region))
    const stylePrompt = provider.calls[2]?.prompt ?? ''
    expect(stylePrompt.toLowerCase()).toMatch(/ground.*identity|identity fields/)
    expect(stylePrompt).not.toMatch(/match.*recognizable speech/i)
    expect(stylePrompt).toContain('Sylwen')
  })
})
