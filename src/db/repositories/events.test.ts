import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { appendEvent, listEventsByCampaign } from './events'

function seedCampaign(db: ReturnType<typeof createTestDb>) {
  return createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
}

describe('events repository: append + listByCampaign', () => {
  it('appends events and lists them back in order', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)

    const first = appendEvent(db, {
      campaignId: campaign.id,
      type: 'region_destroyed',
      payload: { regionId: 'r1' }
    })
    const second = appendEvent(db, {
      campaignId: campaign.id,
      type: 'combat_resolved',
      payload: { winner: 'party' }
    })

    expect(listEventsByCampaign(db, campaign.id).map((e) => e.id)).toEqual([
      first.id,
      second.id
    ])
  })

  it('filters by event type, preserving order', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)

    appendEvent(db, { campaignId: campaign.id, type: 'dialogue', payload: {} })
    const combatOne = appendEvent(db, {
      campaignId: campaign.id,
      type: 'combat_resolved',
      payload: { round: 1 }
    })
    appendEvent(db, { campaignId: campaign.id, type: 'dialogue', payload: {} })
    const combatTwo = appendEvent(db, {
      campaignId: campaign.id,
      type: 'combat_resolved',
      payload: { round: 2 }
    })

    const combatEvents = listEventsByCampaign(db, campaign.id, { type: 'combat_resolved' })

    expect(combatEvents.map((e) => e.id)).toEqual([combatOne.id, combatTwo.id])
  })
})

describe('events repository: limit + payload round-trip', () => {
  it('respects an optional recency limit', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)

    appendEvent(db, { campaignId: campaign.id, type: 'a', payload: {} })
    const second = appendEvent(db, { campaignId: campaign.id, type: 'a', payload: {} })
    const third = appendEvent(db, { campaignId: campaign.id, type: 'a', payload: {} })

    const limited = listEventsByCampaign(db, campaign.id, { limit: 2 })

    expect(limited.map((e) => e.id)).toEqual([second.id, third.id])
  })

  it('round-trips the JSON payload', () => {
    const db = createTestDb()
    const campaign = seedCampaign(db)

    const created = appendEvent(db, {
      campaignId: campaign.id,
      type: 'region_destroyed',
      payload: { regionId: 'r1', cause: 'firebomb' }
    })

    expect(listEventsByCampaign(db, campaign.id)[0]).toEqual(created)
  })
})
