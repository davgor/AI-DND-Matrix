import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createRegion, getRegionById, listRegionsByCampaign, updateRegionStatus } from './regions'

function seedCampaign(db: ReturnType<typeof createTestDb>) {
  return createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
}

describe('regions repository: create + getById round-trip', () => {
  it('round-trips a region with its default status', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)

    const created = createRegion(db, {
      campaignId: campaign.id,
      name: 'Oakhollow',
      description: 'A quiet logging village.'
    })

    expect(getRegionById(db, created.id)).toEqual(created)
    expect(created.status).toEqual({ destroyed: false })
  })

  it('returns undefined for an unknown id', () => {
    const db = createTestDb()
    expect(getRegionById(db, 'does-not-exist')).toBeUndefined()
  })
})

describe('regions repository: listByCampaign', () => {
  it('lists only regions belonging to the given campaign', () => {
    const db = createTestDb()
    const campaignA = seedCampaign(db)
    const campaignB = seedCampaign(db)

    const regionA = createRegion(db, {
      campaignId: campaignA.id,
      name: 'Region A',
      description: '...'
    })
    createRegion(db, { campaignId: campaignB.id, name: 'Region B', description: '...' })

    const results = listRegionsByCampaign(db, campaignA.id)

    expect(results.map((r) => r.id)).toEqual([regionA.id])
  })
})

describe('regions repository: updateStatus', () => {
  it('marks a region destroyed and persists the cause', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)
    const created = createRegion(db, {
      campaignId: campaign.id,
      name: 'Oakhollow',
      description: 'A quiet logging village.'
    })

    updateRegionStatus(db, created.id, { destroyed: true, cause: 'firebomb' })

    expect(getRegionById(db, created.id)?.status).toEqual({ destroyed: true, cause: 'firebomb' })
  })
})
