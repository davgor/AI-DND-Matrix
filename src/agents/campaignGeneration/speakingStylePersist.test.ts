import { describe, expect, it } from 'vitest'
import { createTestDb } from '../../db/testUtils'
import { listNpcsByRegion } from '../../db/repositories/npcs'
import { createCampaign } from '../../db/repositories/campaigns'
import { createScriptedProvider } from '../providers/mockHarness'
import {
  enrichNpcWithSpeakingStyle,
  persistGeneratedCampaign,
  persistRegionWithNpcs
} from './persist'
import { generateSingleNpc } from './index'
import { hasValidNpcSpeakingStyle, normalizeGeneratedNpc } from './normalize'
import {
  makeNpcs,
  makeRegion,
  RACE_LORE_RESPONSE,
  SHIELD_HERO_CANON
} from '../../test/fixtures/campaignGenerationFixtures'
import type { GeneratedBestiaryRoster, GeneratedNpc } from './types'
import { buildAvailableRaceOptions } from '../raceLore'

function findSpeakingStylePrompt(calls: Array<{ prompt: string }>): string {
  return (
    calls.find((call) => call.prompt.includes('"specimen"') || call.prompt.includes('speaking-style'))
      ?.prompt ?? ''
  )
}

const SPEAKING_STYLE_RESPONSE = JSON.stringify({
  specimen: "I keep my voice low and my bargains lower — that's how you survive here.",
  examples: ['Coin first, questions later.', 'You want trouble? Try the next stall.']
})

const NON_SPEAKING_NPC: GeneratedNpc = {
  name: 'Wolf Alpha',
  role: 'beast',
  disposition: 'hostile',
  regionName: 'Test Vale',
  temperament: 'aggressive',
  canSpeak: false
}

function speakingNpc(overrides: Partial<GeneratedNpc> = {}): GeneratedNpc {
  return { ...makeNpcs('Test Vale', 'Style')[0]!, regionName: 'Test Vale', ...overrides }
}

function seedCampaignForStylePersist(db: ReturnType<typeof createTestDb>, name: string, premisePrompt: string) {
  return createCampaign(db, {
    name,
    premisePrompt,
    deathMode: 'standard',
    worldName: 'Test World',
    worldSummary: 'Summary one.\n\nSummary two.\n\nSummary three.',
    worldHistory: 'History one.\n\nHistory two.\n\nHistory three.\n\nHistory four.\n\nHistory five.'
  })
}

function stylePersistProviderQueue() {
  return createScriptedProvider([RACE_LORE_RESPONSE, SPEAKING_STYLE_RESPONSE, '{"upgrade":false}'])
}

const DEFAULT_TEST_BESTIARY: GeneratedBestiaryRoster = {
  foes: [
    {
      name: 'Ash Wolf',
      tags: ['wolf'],
      buckets: ['beast'],
      lore: 'Ash wolves haunt burnt ridgelines where smoke still clings to the scrub.'
    },
    {
      name: 'Cave Crawler',
      tags: ['ambush'],
      buckets: ['beast'],
      lore: 'Cave crawlers cling to damp ceilings and drop when torchlight wobbles.'
    },
    {
      name: 'Bog Wight',
      tags: ['undead'],
      buckets: ['undead'],
      lore: 'Bog wights rise where travelers drowned with unpaid debts still clutched in their fists.'
    }
  ]
}

describe('normalizeGeneratedNpc speaking-style clearing', () => {
  it('clears speaking-style fields for non-speaking NPCs', () => {
    const normalized = normalizeGeneratedNpc({
      ...speakingNpc(),
      canSpeak: false,
      speakingStyleSpecimen: 'should be cleared',
      speakingStyleExamples: ['line one', 'line two']
    })
    expect(normalized?.canSpeak).toBe(false)
    expect(normalized?.speakingStyleSpecimen).toBeNull()
    expect(normalized?.speakingStyleExamples).toBeNull()
  })
})

describe('hasValidNpcSpeakingStyle', () => {
  it('requires specimen and 2–3 examples for speakers', () => {
    const npc = speakingNpc({
      speakingStyleSpecimen: 'Voice sample.',
      speakingStyleExamples: ['One.', 'Two.']
    })
    expect(hasValidNpcSpeakingStyle(npc)).toBe(true)
  })

  it('rejects speakers missing speaking style', () => {
    expect(hasValidNpcSpeakingStyle(speakingNpc())).toBe(false)
  })

  it('accepts non-speakers without speaking style', () => {
    expect(hasValidNpcSpeakingStyle(NON_SPEAKING_NPC)).toBe(true)
  })
})

describe('enrichNpcWithSpeakingStyle', () => {
  it('attaches specimen and examples for speaking NPCs', async () => {
    const provider = createScriptedProvider([SPEAKING_STYLE_RESPONSE])
    const enriched = await enrichNpcWithSpeakingStyle(provider, speakingNpc())
    expect(enriched.speakingStyleSpecimen).toContain('voice low')
    expect(enriched.speakingStyleExamples).toHaveLength(2)
    expect(hasValidNpcSpeakingStyle(enriched)).toBe(true)
  })

  it('nulls speaking-style fields for non-speakers without LLM call', async () => {
    const provider = createScriptedProvider([])
    const enriched = await enrichNpcWithSpeakingStyle(provider, NON_SPEAKING_NPC)
    expect(enriched.speakingStyleSpecimen).toBeNull()
    expect(enriched.speakingStyleExamples).toBeNull()
    expect(provider.calls).toHaveLength(0)
  })

  it('passes fandom hint when preferredCanonName is supplied', async () => {
    const provider = createScriptedProvider([SPEAKING_STYLE_RESPONSE])
    await enrichNpcWithSpeakingStyle(provider, speakingNpc({ name: 'Raphtalia' }), {
      fandomCharacterHint: 'Raphtalia',
      settingLabel: SHIELD_HERO_CANON.settingLabel
    })
    const prompt = provider.calls[0]?.prompt ?? ''
    expect(prompt).toContain('Raphtalia')
    expect(prompt).toContain(SHIELD_HERO_CANON.settingLabel)
    expect(prompt.toLowerCase()).toMatch(/recognizable speech|fandom|source material/)
  })
})

describe('persistRegionWithNpcs speaking style — speakers', () => {
  it('persists specimen and examples for speaking NPCs', async () => {
    const db = createTestDb()
    const campaign = seedCampaignForStylePersist(db, 'Style Test', 'A test realm.')
    const npc = speakingNpc()
    const provider = stylePersistProviderQueue()
    await persistRegionWithNpcs({
      db,
      provider,
      campaignId: campaign.id,
      generatedRegion: makeRegion('Other Fen', 'fen'),
      generatedNpcs: [{ ...npc, regionName: 'Other Fen' }]
    })
    const regions = db
      .prepare('SELECT id, name FROM regions WHERE campaign_id = ?')
      .all(campaign.id) as Array<{ id: string; name: string }>
    const other = regions.find((row) => row.name === 'Other Fen')
    expect(other).toBeDefined()
    const npcs = listNpcsByRegion(db, other!.id)
    expect(npcs).toHaveLength(1)
    expect(npcs[0]?.speakingStyleSpecimen).toContain('voice low')
    expect(npcs[0]?.speakingStyleExamples).toHaveLength(2)
  })
})

describe('persistRegionWithNpcs speaking style — non-speakers', () => {
  it('persists null speaking-style fields for non-speaking NPCs', async () => {
    const db = createTestDb()
    const campaign = seedCampaignForStylePersist(db, 'Beast Test', 'Wilderness.')
    const provider = createScriptedProvider([])
    await persistRegionWithNpcs({
      db,
      provider,
      campaignId: campaign.id,
      generatedRegion: makeRegion('Beast Fen', 'beast'),
      generatedNpcs: [{ ...NON_SPEAKING_NPC, regionName: 'Beast Fen' }]
    })
    const regions = db
      .prepare('SELECT id FROM regions WHERE campaign_id = ? AND name = ?')
      .get(campaign.id, 'Beast Fen') as { id: string } | undefined
    expect(regions).toBeDefined()
    const npcs = listNpcsByRegion(db, regions!.id)
    expect(npcs[0]?.speakingStyleSpecimen).toBeNull()
    expect(npcs[0]?.speakingStyleExamples).toBeNull()
    expect(provider.calls).toHaveLength(0)
  })
})

describe('persistRegionWithNpcs speaking style — fandom hints', () => {
  it('matches knownCharacters by name for fandom speaking-style prompt', async () => {
    const db = createTestDb()
    const campaign = seedCampaignForStylePersist(db, 'Fandom Test', 'Shield hero premise.')
    const provider = stylePersistProviderQueue()
    await persistRegionWithNpcs({
      db,
      provider,
      campaignId: campaign.id,
      generatedRegion: makeRegion('Canon Fen', 'canon'),
      generatedNpcs: [{ ...speakingNpc({ name: 'Raphtalia' }), regionName: 'Canon Fen' }],
      knownCharacters: SHIELD_HERO_CANON.knownCharacters,
      settingLabel: SHIELD_HERO_CANON.settingLabel
    })
    const stylePrompt = findSpeakingStylePrompt(provider.calls)
    expect(stylePrompt).toContain('Raphtalia')
    expect(stylePrompt.toLowerCase()).toMatch(/recognizable speech|fandom/)
  })
})

describe('persistGeneratedCampaign speaking style', () => {
  it('persists speaking-style fields for campaign seed NPCs', async () => {
    const db = createTestDb()
    const npcs = makeNpcs('Seed Vale', 'Seed').map((npc) => ({
      ...npc,
      regionName: 'Seed Vale'
    }))
    const provider = createScriptedProvider([
      RACE_LORE_RESPONSE,
      SPEAKING_STYLE_RESPONSE,
      '{"upgrade":false}',
      SPEAKING_STYLE_RESPONSE,
      '{"upgrade":false}',
      SPEAKING_STYLE_RESPONSE,
      '{"upgrade":false}'
    ])
    const campaign = await persistGeneratedCampaign({
      db,
      provider,
      input: {
        name: 'Seed Campaign',
        premisePrompt: 'A seeded realm.',
        deathMode: 'standard'
      },
      generation: {
        world: {
          worldName: 'Seed World',
          worldSummary: 'Summary one.\n\nSummary two.\n\nSummary three.',
          worldHistory:
            'History one.\n\nHistory two.\n\nHistory three.\n\nHistory four.\n\nHistory five.'
        },
        pantheon: {
          pantheonSummary: 'Gods walk.',
          deities: []
        },
        regions: [makeRegion('Seed Vale', 'seed')],
        npcs,
        bestiary: DEFAULT_TEST_BESTIARY,
        storyThread: { title: 'Arc', state: 'open', summary: 'Begin.' }
      }
    })
    const region = db
      .prepare('SELECT id FROM regions WHERE campaign_id = ? AND name = ?')
      .get(campaign.id, 'Seed Vale') as { id: string } | undefined
    const persisted = listNpcsByRegion(db, region!.id)
    expect(persisted.every((npc) => npc.canSpeak && npc.speakingStyleSpecimen)).toBe(true)
    expect(persisted.every((npc) => (npc.speakingStyleExamples?.length ?? 0) >= 2)).toBe(true)
  })
})

describe('generateSingleNpc speaking-style post-pass', () => {
  it('enriches speaking NPC with fandom hint when preferredCanonName is set', async () => {
    const region = makeRegion('Melromarc Outskirts', 'mel')
    const npcPayload = JSON.stringify({
      npc: {
        ...makeNpcs(region.name, 'Canon')[0]!,
        name: 'Raphtalia',
        regionName: region.name
      }
    })
    const provider = createScriptedProvider([npcPayload, SPEAKING_STYLE_RESPONSE])
    const result = await generateSingleNpc(provider, {
      campaignPremise: 'The Rising of the Shield Hero',
      regionName: region.name,
      regionDescription: region.description,
      existingNpcNames: [],
      seedPrompt: 'Create Raphtalia as a distinct local character.',
      availableRaces: buildAvailableRaceOptions([]),
      canon: SHIELD_HERO_CANON,
      preferredCanonName: 'Raphtalia'
    })
    expect(result.npc.speakingStyleSpecimen).toContain('voice low')
    expect(result.npc.speakingStyleExamples).toHaveLength(2)
    const stylePrompt = provider.calls[1]?.prompt ?? ''
    expect(stylePrompt).toContain('Raphtalia')
    expect(stylePrompt.toLowerCase()).toMatch(/recognizable speech|fandom/)
  })
})
