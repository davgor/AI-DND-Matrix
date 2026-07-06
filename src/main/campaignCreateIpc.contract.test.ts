import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import {
  buildCrimsonReachCascadingResponses,
  buildRealisticLlmCascadingSeedResponses,
  npcReviewResponses,
  RACE_LORE_RESPONSE
} from '../agents/campaignGeneration/fixtures'
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
    RACE_LORE_RESPONSE,
    ...npcReviewResponses(6)
  ])
}

describe('createCampaignFromRequest contract — default setup form', () => {
  it('succeeds for 2 regions, 3 NPCs, and standard death mode', async () => {
    resetCampaignCreateForTests()
    const db = createTestDb()
    const result = await createCampaignFromRequest(db, providerForDefaultForm(), DEFAULT_CREATE_REQUEST)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.detail.campaign?.name).toBe('Saga of Ashen Crown')
    expect(result.detail.campaign?.worldName).toBe('Eldermere')
    expect(result.detail.campaign?.worldSummary).toContain('desert caravan city')
    expect(result.detail.regions).toHaveLength(2)
    expect(result.detail.npcs).toHaveLength(6)
    expect(result.detail.storyThreads[0]?.title).toBe('The Missing Envoy')
  })

  it('accepts realistic live-model response shapes', async () => {
    resetCampaignCreateForTests()
    const db = createTestDb()
    const result = await createCampaignFromRequest(db, providerForDefaultForm(), DEFAULT_CREATE_REQUEST)
    expect(result.ok).toBe(true)
  })

  it('succeeds for Crimson Reach premise with friendly temperament and Human race labels', async () => {
    resetCampaignCreateForTests()
    const db = createTestDb()
    const provider = createScriptedProvider([
      ...buildCrimsonReachCascadingResponses({ regionCount: 2, npcsPerRegion: 3 }),
      RACE_LORE_RESPONSE,
      ...npcReviewResponses(6)
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
    }
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
