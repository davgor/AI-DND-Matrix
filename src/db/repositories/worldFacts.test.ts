import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createRegion } from './regions'
import { createWorldFact, listWorldFactsByRegionOrFaction } from './worldFacts'

function seedCampaign(db: ReturnType<typeof createTestDb>) {
  return createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
}

describe('worldFacts repository: region tag retrieval', () => {
  it('retrieves facts tagged to a region without returning unrelated facts', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const region = createRegion(db, {
      campaignId: campaign.id,
      name: 'Oakhollow',
      description: '...'
    })
    const otherRegion = createRegion(db, {
      campaignId: campaign.id,
      name: 'Other',
      description: '...'
    })

    const regionFact = createWorldFact(db, {
      campaignId: campaign.id,
      regionId: region.id,
      content: 'Oakhollow was burned down.'
    })
    createWorldFact(db, {
      campaignId: campaign.id,
      regionId: otherRegion.id,
      content: 'Unrelated region fact.'
    })
    createWorldFact(db, {
      campaignId: campaign.id,
      factionTag: 'bandits',
      content: 'Unrelated faction fact.'
    })

    const results = listWorldFactsByRegionOrFaction(db, campaign.id, region.id)

    expect(results.map((f) => f.id)).toEqual([regionFact.id])
  })
})

describe('worldFacts repository: faction tag retrieval + null defaults', () => {
  it('retrieves facts tagged to a faction without returning unrelated facts', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)

    const factionFact = createWorldFact(db, {
      campaignId: campaign.id,
      factionTag: 'bandits',
      content: 'The bandits razed the outpost.'
    })
    createWorldFact(db, {
      campaignId: campaign.id,
      factionTag: 'merchants-guild',
      content: 'Unrelated faction fact.'
    })

    const results = listWorldFactsByRegionOrFaction(db, campaign.id, 'bandits')

    expect(results.map((f) => f.id)).toEqual([factionFact.id])
  })

  it('round-trips null region_id and faction_tag', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)

    const created = createWorldFact(db, {
      campaignId: campaign.id,
      content: 'General campaign-wide fact.'
    })

    expect(created.regionId).toBeNull()
    expect(created.factionTag).toBeNull()
  })
})
