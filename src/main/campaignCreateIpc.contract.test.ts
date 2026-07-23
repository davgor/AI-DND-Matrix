import { describe, expect, it } from 'vitest'
import { listBestiarySpecies } from '../db/repositories/bestiary'
import {
  listFactionRelationsByCampaign,
  listFactionsByCampaign
} from '../db/repositories/factions'
import { FACTION_PRESSURE_BANDS, parseFactionPressure } from '../shared/factions'
import { createTestDb } from '../db/testUtils'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import {
  buildCrimsonReachCascadingResponses,
  buildRealisticLlmCascadingSeedResponses,
  buildShieldHeroCascadingSeedResponses,
  persistNpcEnrichmentResponses,
  REALISTIC_FACTIONS_BLOCK_DRIFT_RESPONSE
} from '../test/fixtures/campaignGenerationFixtures'
import { createCampaignFromRequest, resetCampaignCreateForTests } from './campaignCreateIpc'

const GENERATION_FAILURE_MESSAGE =
  'The narrative engine returned an invalid campaign. Try again or simplify your premise.'

const DEFAULT_CREATE_REQUEST = {
  sessionId: 'contract-default-form',
  name: 'Saga of Ashen Crown',
  premisePrompt:
    'Winter closes in on a desert caravan city while a missing envoy never returned from the uplands.',
  deathMode: 'standard' as const,
  regionCount: 2,
  npcsPerRegion: 3
}

function providerForDefaultForm(): ReturnType<typeof createScriptedProvider> {
  return createScriptedProvider([
    ...buildRealisticLlmCascadingSeedResponses({ regionCount: 2, npcsPerRegion: 3 }),
    ...persistNpcEnrichmentResponses(6)
  ])
}

function expectDefaultFormCreateOk(
  db: ReturnType<typeof createTestDb>,
  result: Awaited<ReturnType<typeof createCampaignFromRequest>>
): void {
  expect(result.ok).toBe(true)
  if (!result.ok) {
    return
  }
  expect(result.detail.campaign?.name).toBe('Saga of Ashen Crown')
  expect(result.detail.campaign?.worldName).toBe('Eldermere')
  expect(result.detail.campaign?.worldSummary).toContain('desert caravan realm')
  expect(result.detail.campaign?.pantheonSummary).toBeTruthy()
  expect(result.detail.deities.length).toBeGreaterThanOrEqual(8)
  expect(result.detail.deities.length).toBeLessThanOrEqual(12)
  expect(result.detail.deities.filter((deity) => deity.isForgotten).length).toBeGreaterThanOrEqual(2)
  const pressure = parseFactionPressure(result.detail.campaign?.factionPressure)
  expect(pressure).toBeDefined()
  const band = FACTION_PRESSURE_BANDS[pressure!]
  const factions = listFactionsByCampaign(db, result.detail.campaign!.id)
  expect(factions.length).toBeGreaterThanOrEqual(band.minFactions)
  expect(factions.length).toBeLessThanOrEqual(band.maxFactions)
  expect(result.detail.campaign?.factionsSummary?.trim().length).toBeGreaterThan(0)
  expect(factions.some((faction) => faction.kind === 'religious')).toBe(true)
  expect(factions.some((faction) => faction.deityId !== null)).toBe(true)
  const relations = listFactionRelationsByCampaign(db, result.detail.campaign!.id)
  expect(relations.length).toBeGreaterThanOrEqual(band.minRelations)
  expect(relations.length).toBeLessThanOrEqual(band.maxRelations)
  expect(result.detail.regions).toHaveLength(2)
  expect(result.detail.npcs).toHaveLength(6)
  expect(result.detail.storyThreads[0]?.title).toBe('The Missing Envoy')
  const species = listBestiarySpecies(db, result.detail.campaign!.id)
  expect(species.length).toBeGreaterThanOrEqual(3)
  expect(species.every((entry) => entry.baseLore.trim().length > 0)).toBe(true)
}

describe('createCampaignFromRequest contract — default setup form', () => {
  it('succeeds for 2 regions, 3 NPCs, and standard death mode', async () => {
    resetCampaignCreateForTests()
    const db = createTestDb()
    const result = await createCampaignFromRequest(db, providerForDefaultForm(), DEFAULT_CREATE_REQUEST)
    expectDefaultFormCreateOk(db, result)
  })

  it('accepts realistic live-model response shapes', async () => {
    resetCampaignCreateForTests()
    const db = createTestDb()
    const result = await createCampaignFromRequest(db, providerForDefaultForm(), DEFAULT_CREATE_REQUEST)
    expect(result.ok).toBe(true)
  })

  it('accepts labeled-block faction dumps with prose noise around tags (161.6)', async () => {
    resetCampaignCreateForTests()
    const db = createTestDb()
    const responses = buildRealisticLlmCascadingSeedResponses({ regionCount: 2, npcsPerRegion: 3 })
    responses[3] = REALISTIC_FACTIONS_BLOCK_DRIFT_RESPONSE
    const provider = createScriptedProvider([...responses, ...persistNpcEnrichmentResponses(6)])
    const result = await createCampaignFromRequest(db, provider, {
      ...DEFAULT_CREATE_REQUEST,
      sessionId: 'contract-faction-block-drift'
    })
    expect(result.ok).toBe(true)
  })
})

describe('createCampaignFromRequest contract — Crimson Reach', () => {
  it('succeeds for Crimson Reach premise with friendly temperament and Human race labels', async () => {
    resetCampaignCreateForTests()
    const db = createTestDb()
    const provider = createScriptedProvider([
      ...buildCrimsonReachCascadingResponses({ regionCount: 2, npcsPerRegion: 3 }),
      ...persistNpcEnrichmentResponses(6)
    ])
    const result = await createCampaignFromRequest(db, provider, {
      sessionId: 'contract-crimson-reach',
      name: 'The Crimson Reach',
      premisePrompt:
        'After a failed harvest, survivors gather in a mountain pass and face bandits who now wear the faces of the dead.',
      deathMode: 'standard',
      regionCount: 2,
      npcsPerRegion: 3
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.detail.campaign?.worldName).toBe('Venn Calder')
      expect(result.detail.npcs).toHaveLength(6)
      expect(listBestiarySpecies(db, result.detail.campaign!.id).length).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('createCampaignFromRequest contract — Shield Hero foes', () => {
  it('seeds slime and rift-beast style foes for Shield Hero-like premises', async () => {
    resetCampaignCreateForTests()
    const db = createTestDb()
    const provider = createScriptedProvider([
      ...buildShieldHeroCascadingSeedResponses({ regionCount: 2, npcsPerRegion: 1 }),
      ...persistNpcEnrichmentResponses(2)
    ])
    const result = await createCampaignFromRequest(db, provider, {
      sessionId: 'contract-shield-bestiary',
      name: 'Waves of Melromarc',
      premisePrompt: 'Campaign set in the world of the shield hero with rift Waves and slimes',
      deathMode: 'standard',
      regionCount: 2,
      npcsPerRegion: 1
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    const species = listBestiarySpecies(db, result.detail.campaign!.id)
    expect(species.length).toBeGreaterThanOrEqual(3)
    const blob = species
      .map((entry) => `${entry.name} ${entry.tags.join(' ')}`)
      .join(' ')
      .toLowerCase()
    expect(blob.includes('slime')).toBe(true)
    expect(blob.includes('rift')).toBe(true)
  })
})

describe('createCampaignFromRequest contract — generation failure', () => {
  it('maps schema errors to the player-facing generation failure copy', async () => {
    resetCampaignCreateForTests()
    const db = createTestDb()
    const result = await createCampaignFromRequest(db, createScriptedProvider(['not-json']), {
      sessionId: 'contract-generation-failure',
      premisePrompt: 'Broken premise'
    })
    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.category).toBe('generation')
    expect(result.message).toBe(GENERATION_FAILURE_MESSAGE)
  })

  it('does not persist partial campaigns when generation fails', async () => {
    resetCampaignCreateForTests()
    const db = createTestDb()
    const before = db.prepare('SELECT COUNT(*) as count FROM campaigns').get() as { count: number }
    const result = await createCampaignFromRequest(db, createScriptedProvider(['not-json']), {
      sessionId: 'contract-no-partial-rows',
      premisePrompt: 'Broken premise'
    })
    const after = db.prepare('SELECT COUNT(*) as count FROM campaigns').get() as { count: number }
    expect(result.ok).toBe(false)
    expect(after.count).toBe(before.count)
  })
})
