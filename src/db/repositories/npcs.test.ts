import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import {
  createNpc,
  getNpcById,
  listNpcsByRegion,
  markNpcPromoted,
  updateNpcDisposition,
  updateNpcStatus
} from './npcs'
import { createRegion } from './regions'

function seedRegion(db: ReturnType<typeof createTestDb>) {
  const campaign = createCampaign(db, {
    name: 'Test Campaign',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
  return createRegion(db, { campaignId: campaign.id, name: 'Oakhollow', description: '...' })
}

describe('npcs repository: create + getById round-trip', () => {
  it('round-trips an NPC with its default status and is_party_member false', () => {
    const db = createTestDb()
    const region = seedRegion(db)

    const created = createNpc(db, {
      campaignId: region.campaignId,
      regionId: region.id,
      name: 'Bram the Woodcutter',
      role: 'villager',
      disposition: 'friendly'
    })

    expect(getNpcById(db, created.id)).toEqual(created)
    expect(created.status).toEqual({ alive: true })
    expect(created.isPartyMember).toBe(false)
  })
})

describe('npcs repository: listByRegion', () => {
  it('lists only NPCs belonging to the given region', () => {
    const db = createTestDb()
    const region = seedRegion(db)
    const otherRegion = createRegion(db, {
      campaignId: region.campaignId,
      name: 'Other',
      description: '...'
    })

    const npcInRegion = createNpc(db, {
      campaignId: region.campaignId,
      regionId: region.id,
      name: 'A',
      role: 'villager',
      disposition: 'friendly'
    })
    createNpc(db, {
      campaignId: region.campaignId,
      regionId: otherRegion.id,
      name: 'B',
      role: 'villager',
      disposition: 'friendly'
    })

    expect(listNpcsByRegion(db, region.id).map((n) => n.id)).toEqual([npcInRegion.id])
  })
})

describe('npcs repository: updateStatus + markPromoted', () => {
  it('updates status', () => {
    const db = createTestDb()
    const region = seedRegion(db)
    const created = createNpc(db, {
      campaignId: region.campaignId,
      regionId: region.id,
      name: 'Bram',
      role: 'villager',
      disposition: 'friendly'
    })

    updateNpcStatus(db, created.id, { alive: false })

    expect(getNpcById(db, created.id)?.status).toEqual({ alive: false })
  })

  it('marks an NPC promoted, setting is_party_member to true', () => {
    const db = createTestDb()
    const region = seedRegion(db)
    const created = createNpc(db, {
      campaignId: region.campaignId,
      regionId: region.id,
      name: 'Bram',
      role: 'villager',
      disposition: 'friendly'
    })
    expect(created.isPartyMember).toBe(false)

    markNpcPromoted(db, created.id)

    expect(getNpcById(db, created.id)?.isPartyMember).toBe(true)
  })

  it('updates disposition', () => {
    const db = createTestDb()
    const region = seedRegion(db)
    const created = createNpc(db, {
      campaignId: region.campaignId,
      regionId: region.id,
      name: 'Bram',
      role: 'villager',
      disposition: 'friendly'
    })

    updateNpcDisposition(db, created.id, 'wary, after the bandit raid')

    expect(getNpcById(db, created.id)?.disposition).toBe('wary, after the bandit raid')
  })
})
