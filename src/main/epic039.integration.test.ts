import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createNpc } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { createScriptedProvider } from '../agents/providers/mockHarness'
import { buildCascadingSeedResponses, NPC_SPEAKING_STYLE_RESPONSE, persistNpcEnrichmentResponses, RACE_LORE_RESPONSE, additionalRegionLabeledBlocks } from '../test/fixtures/campaignGenerationFixtures'
import { createCampaignFromRequest, resetCampaignCreateForTests } from './campaignCreateIpc'
import { generateNpcForCampaign, generateRegionForCampaign } from './campaignEditIpc'
import { canContinueCampaignReview, getCampaignReviewContinueBlockers } from '../shared/campaignReview/campaignReviewValidation'
import { canEnterCampaignPlay, getCampaignPlayBlockers } from '../shared/campaignPlay/campaignPlayReady'
import { makeNpcs, makeRegion, SINGLE_NPC_CORE_BUNDLE, SINGLE_NPC_FINAL } from './epic039.integration.fixtures'

function epic039PlayGateNpcProvider() {
  return createScriptedProvider([
    SINGLE_NPC_CORE_BUNDLE,
    RACE_LORE_RESPONSE,
    SINGLE_NPC_FINAL,
    NPC_SPEAKING_STYLE_RESPONSE,
    '{"upgrade":false}'
  ])
}

describe('epic 039 create handoff', () => {
  it('honors custom initial counts through create → review', async () => {
    resetCampaignCreateForTests()
    const db = createTestDb()
    const provider = createScriptedProvider([
      ...buildCascadingSeedResponses({
        regionCount: 1,
        npcsPerRegion: 1,
        regions: [makeRegion('Lonely Reach')],
        storyThread: { title: 'Solo Arc', state: 'starting', summary: 'A small start.' }
      }),
      ...persistNpcEnrichmentResponses(1)
    ])
    const result = await createCampaignFromRequest(db, provider, {
      sessionId: 'epic-039-create',
      premisePrompt: 'A sparse frontier',
      regionCount: 1,
      npcsPerRegion: 1
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.detail.regions).toHaveLength(1)
    expect(result.detail.npcs).toHaveLength(1)
    expect(canContinueCampaignReview(result.detail)).toBe(true)
  })
})

describe('epic 039 review gates', () => {
  it('blocks continue then unblocks after region generation', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Gate Test',
      premisePrompt: 'A quiet land',
      deathMode: 'standard'
    })
    const region = createRegion(db, {
      campaignId: campaign.id,
      name: 'Empty Vale',
      description: 'A quiet valley.'
    })
    const detail = {
      campaign,
      regions: [region],
      npcs: [],
      regionExtras: [],
      storyThreads: [],
      characters: [],
      deities: [],
      factions: [],
      factionRelations: [],
      bestiary: []
    }
    expect(getCampaignReviewContinueBlockers(detail)).toContain('no-npcs')

    const regionPayload = additionalRegionLabeledBlocks(
      makeRegion('Mistfen Crossing'),
      makeNpcs('Mistfen Crossing', 'Mist').slice(0, 1)
    )
    const regionProvider = createScriptedProvider([regionPayload, ...persistNpcEnrichmentResponses(1)])
    const afterRegion = await generateRegionForCampaign(db, regionProvider, {
      campaignId: campaign.id,
      seedPrompt: 'A foggy crossing',
      npcCount: 1
    })
    expect(canContinueCampaignReview(afterRegion)).toBe(true)
  })
})

describe('epic 039 play gate', () => {
  it('blocks when a region lacks NPCs and allows when populated', async () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Play Gate',
      premisePrompt: 'Two regions',
      deathMode: 'standard'
    })
    const regionA = createRegion(db, {
      campaignId: campaign.id,
      name: 'Oakhollow',
      description: 'Woods.'
    })
    const regionB = createRegion(db, {
      campaignId: campaign.id,
      name: 'Mistfen',
      description: 'Fog.'
    })
    createNpc(db, {
      campaignId: campaign.id,
      regionId: regionA.id,
      name: 'Mira',
      role: 'guide',
      disposition: 'friendly'
    })
    const blocked = {
      campaign,
      regions: [regionA, regionB],
      npcs: [{ id: 'n1', campaignId: campaign.id, regionId: regionA.id, name: 'Mira' } as never],
      regionExtras: [],
      storyThreads: [],
      characters: [],
      deities: [],
      factions: [],
      factionRelations: [],
      bestiary: []
    }
    expect(getCampaignPlayBlockers(blocked)).toHaveLength(1)
    expect(canEnterCampaignPlay(blocked)).toBe(false)

    const afterNpc = await generateNpcForCampaign(db, epic039PlayGateNpcProvider(), {
      campaignId: campaign.id,
      regionId: regionB.id,
      seedPrompt: 'A hermit'
    })
    expect(canEnterCampaignPlay(afterNpc)).toBe(true)
  })
})
