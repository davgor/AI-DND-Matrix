import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import {
  bumpNpcPlayerInteractionAt,
  createNpc,
  getNpcById,
  listNpcsByRegion,
  listNpcsWithGeneratedOpinion,
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

function seedOpinionCampaignNpcs(db: ReturnType<typeof createTestDb>) {
  const region = seedRegion(db)
  return {
    region,
    withoutOpinion: createNpc(db, {
      campaignId: region.campaignId,
      regionId: region.id,
      name: 'Zed',
      role: 'villager',
      disposition: 'friendly'
    }),
    mira: createNpc(db, {
      campaignId: region.campaignId,
      regionId: region.id,
      name: 'Mira',
      role: 'innkeeper',
      disposition: 'friendly'
    }),
    ada: createNpc(db, {
      campaignId: region.campaignId,
      regionId: region.id,
      name: 'Ada',
      role: 'guard',
      disposition: 'neutral'
    })
  }
}

function seedOtherCampaignOpinionNpc(db: ReturnType<typeof createTestDb>) {
  const otherCampaign = createCampaign(db, {
    name: 'Other',
    premisePrompt: '...',
    deathMode: 'legendary'
  })
  const otherRegion = createRegion(db, {
    campaignId: otherCampaign.id,
    name: 'Elsewhere',
    description: '...'
  })
  const otherCampaignNpc = createNpc(db, {
    campaignId: otherCampaign.id,
    regionId: otherRegion.id,
    name: 'Other Mira',
    role: 'merchant',
    disposition: 'friendly'
  })
  updateNpcOpinionSummary(db, otherCampaignNpc.id, {
    summary: 'Should not appear.',
    generatedAt: '2026-07-20T12:00:00.000Z'
  })
  return otherCampaignNpc
}

function seedOpinionListFixtures(db: ReturnType<typeof createTestDb>) {
  const { region, withoutOpinion, mira, ada } = seedOpinionCampaignNpcs(db)
  updateNpcOpinionSummary(db, mira.id, {
    summary: 'Wary but polite.',
    generatedAt: '2026-07-20T12:00:00.000Z'
  })
  updateNpcOpinionSummary(db, ada.id, {
    summary: 'Trusting.',
    generatedAt: '2026-07-20T12:00:00.000Z'
  })
  const otherCampaignNpc = seedOtherCampaignOpinionNpc(db)
  return { region, withoutOpinion, mira, ada, otherCampaignNpc }
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

describe('npcs repository: appearance traits', () => {
  it('defaults appearance columns to null on create', () => {
    const db = createTestDb()
    const region = seedRegion(db)
    const created = createNpc(db, {
      campaignId: region.campaignId,
      regionId: region.id,
      name: 'Mira',
      role: 'innkeeper',
      disposition: 'friendly'
    })

    expect(created.hairColor).toBeNull()
    expect(created.age).toBeNull()
    expect(created.eyeColor).toBeNull()
  })

  it('round-trips nullable appearance fields', () => {
    const db = createTestDb()
    const region = seedRegion(db)
    const created = createNpc(db, {
      campaignId: region.campaignId,
      regionId: region.id,
      name: 'Mira',
      role: 'innkeeper',
      disposition: 'friendly',
      hairColor: 'auburn',
      age: 'middle-aged',
      eyeColor: 'green'
    })

    const loaded = getNpcById(db, created.id)
    expect(loaded?.hairColor).toBe('auburn')
    expect(loaded?.age).toBe('middle-aged')
    expect(loaded?.eyeColor).toBe('green')
  })
})

describe('npcs repository: face token path', () => {
  it('defaults faceTokenPath to null on create', () => {
    const db = createTestDb()
    const region = seedRegion(db)
    const created = createNpc(db, {
      campaignId: region.campaignId,
      regionId: region.id,
      name: 'Mira',
      role: 'innkeeper',
      disposition: 'friendly'
    })

    expect(created.faceTokenPath).toBeNull()
  })
})

describe('npcs repository: listNpcsWithGeneratedOpinion filtering', () => {
  it('includes NPCs with opinionSummary and excludes null, scoped to campaign', () => {
    const db = createTestDb()
    const { region, withoutOpinion, mira, ada, otherCampaignNpc } = seedOpinionListFixtures(db)
    const listed = listNpcsWithGeneratedOpinion(db, region.campaignId)
    expect(listed.map((n) => n.id)).toEqual(expect.arrayContaining([ada.id, mira.id]))
    expect(listed.some((n) => n.id === withoutOpinion.id)).toBe(false)
    expect(listed.some((n) => n.id === otherCampaignNpc.id)).toBe(false)
  })
})

describe('npcs repository: listNpcsWithGeneratedOpinion ordering', () => {
  it('orders results by name ascending', () => {
    const db = createTestDb()
    const region = seedRegion(db)
    const mira = createNpc(db, {
      campaignId: region.campaignId,
      regionId: region.id,
      name: 'Mira',
      role: 'innkeeper',
      disposition: 'friendly'
    })
    const ada = createNpc(db, {
      campaignId: region.campaignId,
      regionId: region.id,
      name: 'Ada',
      role: 'guard',
      disposition: 'neutral'
    })
    updateNpcOpinionSummary(db, mira.id, {
      summary: 'Wary but polite.',
      generatedAt: '2026-07-20T12:00:00.000Z'
    })
    updateNpcOpinionSummary(db, ada.id, {
      summary: 'Trusting.',
      generatedAt: '2026-07-20T12:00:00.000Z'
    })

    const listed = listNpcsWithGeneratedOpinion(db, region.campaignId)
    expect(listed.map((n) => n.id)).toEqual([ada.id, mira.id])
    expect(listed.map((n) => n.name)).toEqual(['Ada', 'Mira'])
  })
})

describe('npcs repository: dossier opinion defaults', () => {
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
})

describe('npcs repository: dossier opinion persistence', () => {
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
