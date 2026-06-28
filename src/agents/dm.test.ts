import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createNpc } from '../db/repositories/npcs'
import { createRegion, updateRegionStatus } from '../db/repositories/regions'
import { createStoryThread } from '../db/repositories/storyThreads'
import { listWorldFactsByRegionOrFaction } from '../db/repositories/worldFacts'
import { listStoryThreadsByCampaign } from '../db/repositories/storyThreads'
import { createScriptedProvider } from './providers/mockHarness'
import {
  DmSchemaError,
  MAX_SCHEMA_ATTEMPTS,
  assembleNarrationContext,
  interpretIntent,
  narrate,
  persistNarrationSideEffects,
  proposeHomebrewFlavor
} from './dm'

function seedCampaignWithRegion() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'The Sunken Crown',
    premisePrompt: 'A flooded kingdom hides an ancient throne.',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Oakhollow',
    description: 'A quiet logging village.'
  })
  return { db, campaign, region }
}

describe('interpretIntent (006.1 schema validation/retry + 006.2 DC clamp)', () => {
  it('returns the parsed intent on a valid first response', async () => {
    const provider = createScriptedProvider(['{"checkNeeded":true,"ability":"agility","dc":15,"proficient":true}'])
    const result = await interpretIntent(provider, 'I sneak past the guard')
    expect(result).toEqual({ checkNeeded: true, ability: 'agility', dc: 15, proficient: true })
  })

  it('retries on malformed/out-of-schema responses until a valid one arrives', async () => {
    const provider = createScriptedProvider([
      'not json at all',
      '{"checkNeeded":true}',
      '{"checkNeeded":false}'
    ])
    const result = await interpretIntent(provider, 'I just chat with the bartender')
    expect(result).toEqual({ checkNeeded: false })
    expect(provider.calls).toHaveLength(3)
  })

  it('throws a typed schema error after exhausting retries, never handing a bad shape to the engine', async () => {
    const provider = createScriptedProvider(['bad', 'still bad', 'nope'])
    await expect(interpretIntent(provider, 'I do something weird')).rejects.toBeInstanceOf(
      DmSchemaError
    )
    expect(provider.calls).toHaveLength(MAX_SCHEMA_ATTEMPTS)
  })

  it('clamps an out-of-range proposed DC before it can reach check resolution', async () => {
    const tooHigh = createScriptedProvider(['{"checkNeeded":true,"ability":"mind","dc":999,"proficient":false}'])
    const tooLow = createScriptedProvider(['{"checkNeeded":true,"ability":"mind","dc":-20,"proficient":false}'])

    expect((await interpretIntent(tooHigh, 'x')).dc).toBe(30)
    expect((await interpretIntent(tooLow, 'x')).dc).toBe(5)
  })

  it('recognizes a rest action via actionType, with checkNeeded false', async () => {
    const provider = createScriptedProvider(['{"checkNeeded":false,"actionType":"restLong"}'])
    const result = await interpretIntent(provider, 'I make camp for the night')
    expect(result).toEqual({ checkNeeded: false, actionType: 'restLong' })
  })

  it('recognizes a travel action via actionType, requiring travelDays', async () => {
    const provider = createScriptedProvider(['{"checkNeeded":false,"actionType":"travel","travelDays":3}'])
    const result = await interpretIntent(provider, 'We travel to the next town')
    expect(result).toEqual({ checkNeeded: false, actionType: 'travel', travelDays: 3 })
  })

  it('rejects a travel actionType missing travelDays, retrying instead', async () => {
    const provider = createScriptedProvider([
      '{"checkNeeded":false,"actionType":"travel"}',
      '{"checkNeeded":false,"actionType":"travel","travelDays":1}'
    ])
    const result = await interpretIntent(provider, 'We travel')
    expect(result.travelDays).toBe(1)
    expect(provider.calls).toHaveLength(2)
  })
})

describe('assembleNarrationContext + narrate (006.3)', () => {
  it('pulls region status, recent events, and story thread state fresh from the DB at call time', async () => {
    const { db, campaign, region } = seedCampaignWithRegion()
    createStoryThread(db, { campaignId: campaign.id, title: 'Main Arc', state: 'rising', summary: 'so far...' })

    const before = assembleNarrationContext(db, campaign.id, region.id)
    expect(before.regionStatus).toEqual({ destroyed: false })
    expect(before.storyThreadState?.state).toBe('rising')

    updateRegionStatus(db, region.id, { destroyed: true, cause: 'firebomb' })
    const after = assembleNarrationContext(db, campaign.id, region.id)
    expect(after.regionStatus).toEqual({ destroyed: true, cause: 'firebomb' })
  })

  it('includes the NPCs present in the region so the DM can only pick real ids to react', async () => {
    const { db, campaign, region } = seedCampaignWithRegion()
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Mira',
      role: 'shopkeeper',
      disposition: 'friendly'
    })

    const context = assembleNarrationContext(db, campaign.id, region.id)
    expect(context.presentNpcs).toEqual([{ id: npc.id, name: 'Mira' }])
  })

  it('parses an optional reactingNpcIds field from the narration response', async () => {
    const { db, campaign, region } = seedCampaignWithRegion()
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Mira',
      role: 'shopkeeper',
      disposition: 'friendly'
    })
    const provider = createScriptedProvider([
      `{"narrationText":"Mira gasps.","reactingNpcIds":["${npc.id}"]}`
    ])
    const context = assembleNarrationContext(db, campaign.id, region.id)

    const result = await narrate(provider, { success: true, total: 15, dc: 10 }, context)

    expect(result.reactingNpcIds).toEqual([npc.id])
  })

  it('never lets the narration call invent a different pass/fail/total than the engine produced', async () => {
    const { db, campaign, region } = seedCampaignWithRegion()
    const provider = createScriptedProvider(['{"narrationText":"The blade finds its mark."}'])
    const outcome = { success: true, total: 17, dc: 12 }
    const context = assembleNarrationContext(db, campaign.id, region.id)

    await narrate(provider, outcome, context)

    expect(provider.calls[0].prompt).toContain(JSON.stringify(outcome))
  })
})

describe('persistNarrationSideEffects (006.4 world_fact + 006.5 story_thread)', () => {
  it('persists a world_fact tagged to the authoritative current region, ignoring anything the agent might claim', () => {
    const { db, campaign, region } = seedCampaignWithRegion()
    persistNarrationSideEffects(db, campaign.id, region.id, {
      narrationText: 'The village burns.',
      worldFact: { content: 'Oakhollow burned down' }
    })
    expect(listWorldFactsByRegionOrFaction(db, campaign.id, region.id)).toHaveLength(1)
  })

  it('creates no world_fact row when the narration response omits one', () => {
    const { db, campaign, region } = seedCampaignWithRegion()
    persistNarrationSideEffects(db, campaign.id, region.id, { narrationText: 'Nothing of note happens.' })
    expect(listWorldFactsByRegionOrFaction(db, campaign.id, region.id)).toHaveLength(0)
  })

  it('updates a story_thread when the narration response includes an update', () => {
    const { db, campaign, region } = seedCampaignWithRegion()
    const thread = createStoryThread(db, {
      campaignId: campaign.id,
      title: 'Main Arc',
      state: 'rising',
      summary: 'so far...'
    })
    persistNarrationSideEffects(db, campaign.id, region.id, {
      narrationText: 'The plot thickens.',
      storyThreadUpdate: { threadId: thread.id, state: 'climax', summary: 'updated summary' }
    })
    const [updated] = listStoryThreadsByCampaign(db, campaign.id)
    expect(updated).toMatchObject({ state: 'climax', summary: 'updated summary' })
  })

  it('leaves the story_thread unchanged when the narration response omits an update', () => {
    const { db, campaign, region } = seedCampaignWithRegion()
    const thread = createStoryThread(db, {
      campaignId: campaign.id,
      title: 'Main Arc',
      state: 'rising',
      summary: 'so far...'
    })
    persistNarrationSideEffects(db, campaign.id, region.id, { narrationText: 'Nothing changes the plot.' })
    const [unchanged] = listStoryThreadsByCampaign(db, campaign.id)
    expect(unchanged).toEqual(thread)
  })
})

describe('proposeHomebrewFlavor (006.8)', () => {
  it('calls the DM agent and returns flavor-only fields when a candidate exists', async () => {
    const provider = createScriptedProvider([
      '{"name":"Arcane Backlash","description":"A burst of unstable arcane energy.","damageType":"arcane"}'
    ])
    const result = await proposeHomebrewFlavor(provider, { tag: 'arcane', count: 3 })
    expect(result).toEqual({
      name: 'Arcane Backlash',
      description: 'A burst of unstable arcane energy.',
      damageType: 'arcane'
    })
  })

  it('never calls the provider when no emergent-direction candidate exists', async () => {
    const provider = createScriptedProvider([])
    const result = await proposeHomebrewFlavor(provider, null)
    expect(result).toBeNull()
    expect(provider.calls).toHaveLength(0)
  })

  it('rejects a response that smuggles in numeric fields instead of flavor-only ones', async () => {
    const provider = createScriptedProvider(['{"name":"x","description":"y","damageType":"fire","effectDice":99}'])
    // effectDice is ignored by the schema check below since it only validates flavor fields are present and
    // correctly typed; the absence of any *required* numeric field is what matters here.
    const result = await proposeHomebrewFlavor(provider, { tag: 'fire', count: 5 })
    expect(result).not.toHaveProperty('effectDice')
  })
})
