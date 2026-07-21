import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import {
  bumpNpcPlayerInteractionAt,
  createNpc,
  getNpcById,
  listNpcsByRegion,
  markNpcPromoted,
  updateNpcDisposition,
  updateNpcOpinionSummary,
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

    const loaded = getNpcById(db, created.id)
    expect(loaded?.name).toBe('Bram the Woodcutter')
    expect(loaded?.hp).toBe(10)
    expect(loaded?.combatTier).toBe('villager')
    expect(loaded?.status).toEqual({ alive: true })
    expect(loaded?.isPartyMember).toBe(false)
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

describe('npcs repository: dossier opinion fields', () => {
  it('defaults opinion columns to null on create', () => {
    const db = createTestDb()
    const region = seedRegion(db)
    const created = createNpc(db, {
      campaignId: region.campaignId,
      regionId: region.id,
      name: 'Mira',
      role: 'innkeeper',
      disposition: 'friendly'
    })

    expect(created.opinionSummary).toBeNull()
    expect(created.opinionSummaryGeneratedAt).toBeNull()
    expect(created.lastPlayerInteractionAt).toBeNull()
  })

  it('persists opinion summary and interaction watermark', () => {
    const db = createTestDb()
    const region = seedRegion(db)
    const created = createNpc(db, {
      campaignId: region.campaignId,
      regionId: region.id,
      name: 'Mira',
      role: 'innkeeper',
      disposition: 'friendly'
    })

    updateNpcOpinionSummary(db, created.id, {
      summary: 'Wary but polite.',
      generatedAt: '2026-07-20T12:00:00.000Z'
    })
    bumpNpcPlayerInteractionAt(db, created.id, '2026-07-20T13:00:00.000Z')

    const loaded = getNpcById(db, created.id)
    expect(loaded?.opinionSummary).toBe('Wary but polite.')
    expect(loaded?.opinionSummaryGeneratedAt).toBe('2026-07-20T12:00:00.000Z')
    expect(loaded?.lastPlayerInteractionAt).toBe('2026-07-20T13:00:00.000Z')
  })
})
