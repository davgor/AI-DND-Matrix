import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createDeity, listDeitiesByCampaign } from './deities'

describe('deities repository', () => {
  it('creates and lists deities with domains/tenets JSON round-trip and sort_order', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, { name: 'C', premisePrompt: 'p', deathMode: 'legendary' })

    createDeity(db, {
      campaignId: campaign.id,
      name: 'Vhalor',
      epithet: 'the Drowned Judge',
      domains: ['death', 'tides'],
      tenets: ['Keep every oath sworn on water', 'Bury nothing the sea can claim'],
      blurb: 'A stern tide-god who judges oaths.',
      isForgotten: false,
      sortOrder: 1
    })
    createDeity(db, {
      campaignId: campaign.id,
      name: 'Sereth',
      epithet: 'the Hollow Flame',
      domains: ['fire'],
      tenets: ['Tend the last coal', 'Speak no name of the lost'],
      blurb: 'A forgotten hearth power.',
      isForgotten: true,
      sortOrder: 0
    })

    const listed = listDeitiesByCampaign(db, campaign.id)
    expect(listed.map((d) => d.name)).toEqual(['Sereth', 'Vhalor'])
    expect(listed[0]?.domains).toEqual(['fire'])
    expect(listed[0]?.tenets).toHaveLength(2)
    expect(listed[0]?.isForgotten).toBe(true)
    expect(listed[1]?.epithet).toBe('the Drowned Judge')
    expect(listed[1]?.isForgotten).toBe(false)
  })
})
