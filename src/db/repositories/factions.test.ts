import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign, getCampaignById, updateCampaignFactionPressure, updateCampaignFactionsSummary } from './campaigns'
import { createCharacter } from './characters'
import { createDeity } from './deities'
import {
  applyCharacterFactionReputationDelta,
  createFaction,
  createFactionRelation,
  findDivineManifestationNpc,
  getCharacterFactionReputation,
  getFactionById,
  getFactionByKey,
  listCharacterFactionReputations,
  listFactionRelationsByCampaign,
  listFactionsByCampaign,
  setNpcFactionMembership,
  upsertFactionRelation
} from './factions'
import { createNpc, getNpcById, updateNpcFactionFields } from './npcs'
import { createRegion } from './regions'

function seedCampaignWithRegion() {
  const db = createTestDb()
  const campaign = createCampaign(db, {
    name: 'Faction Test',
    premisePrompt: 'Intrigue',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Harbor',
    description: 'Busy docks'
  })
  return { db, campaign, region }
}

describe('campaign factions columns', () => {
  it('defaults factionsSummary empty and factionPressure light on new campaigns', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Legacy-like',
      premisePrompt: 'Quiet',
      deathMode: 'standard'
    })
    expect(campaign.factionsSummary).toBe('')
    expect(campaign.factionPressure).toBe('light')
    expect(getCampaignById(db, campaign.id)?.factionsSummary).toBe('')
    expect(getCampaignById(db, campaign.id)?.factionPressure).toBe('light')
  })

  it('updates factions summary and validates pressure', () => {
    const db = createTestDb()
    const campaign = createCampaign(db, {
      name: 'Pressure',
      premisePrompt: '...',
      deathMode: 'legendary'
    })
    updateCampaignFactionsSummary(db, campaign.id, 'Courts and cults vie for the harbor.')
    updateCampaignFactionPressure(db, campaign.id, 'heavy')
    expect(getCampaignById(db, campaign.id)?.factionsSummary).toBe(
      'Courts and cults vie for the harbor.'
    )
    expect(getCampaignById(db, campaign.id)?.factionPressure).toBe('heavy')
    expect(() => updateCampaignFactionPressure(db, campaign.id, 'extreme' as 'light')).toThrow(
      /factionPressure/
    )
  })
})

function seedTideTempleFactions(db: ReturnType<typeof createTestDb>, campaignId: string, regionId: string, deityId: string) {
  const temple = createFaction(db, {
    campaignId,
    key: 'tide-temple',
    name: 'Tide Temple',
    kind: 'religious',
    summary: 'Clergy of the drowned judge.',
    motivation: 'Enforce sea oaths',
    publicFace: 'Benevolent harbormasters',
    methods: 'Ritual audits',
    deityId,
    homeRegionId: regionId,
    sortOrder: 1,
    source: 'campaign_create'
  })
  createFaction(db, {
    campaignId,
    key: 'dock-guild',
    name: 'Dock Guild',
    kind: 'mercantile',
    summary: 'Controls berths.',
    sortOrder: 0,
    source: 'dm_play'
  })
  return temple
}

function seedRelationPair(db: ReturnType<typeof createTestDb>, campaignId: string) {
  const a = createFaction(db, {
    campaignId,
    key: 'a-court',
    name: 'A Court',
    kind: 'political',
    summary: 'Nobles',
    sortOrder: 0,
    source: 'campaign_create'
  })
  const b = createFaction(db, {
    campaignId,
    key: 'b-guild',
    name: 'B Guild',
    kind: 'criminal',
    summary: 'Thieves',
    sortOrder: 1,
    source: 'campaign_create'
  })
  const [lowId, highId] = a.id < b.id ? [a.id, b.id] : [b.id, a.id]
  return { a, b, lowId, highId }
}

describe('factions repository: create and list', () => {
  it('creates, lists, and loads factions by id/key with deity and region links', () => {
    const { db, campaign, region } = seedCampaignWithRegion()
    const deity = createDeity(db, {
      campaignId: campaign.id,
      name: 'Vhalor',
      epithet: 'the Drowned',
      domains: ['tides'],
      tenets: ['Keep oaths'],
      blurb: 'Tide judge.',
      isForgotten: false,
      sortOrder: 0
    })

    const temple = seedTideTempleFactions(db, campaign.id, region.id, deity.id)

    const listed = listFactionsByCampaign(db, campaign.id)
    expect(listed.map((f) => f.key)).toEqual(['dock-guild', 'tide-temple'])
    expect(getFactionById(db, temple.id)?.deityId).toBe(deity.id)
    expect(getFactionByKey(db, campaign.id, 'tide-temple')?.homeRegionId).toBe(region.id)
    expect(listFactionsByCampaign(db, 'missing')).toEqual([])
  })
})

describe('factions repository: relation order', () => {
  it('creates relations with canonical a<b order', () => {
    const { db, campaign } = seedCampaignWithRegion()
    const { lowId, highId } = seedRelationPair(db, campaign.id)
    const relation = createFactionRelation(db, {
      campaignId: campaign.id,
      factionAId: highId,
      factionBId: lowId,
      stance: 'rival',
      summary: 'Harbor bribes'
    })
    expect(relation.factionAId).toBe(lowId)
    expect(relation.factionBId).toBe(highId)
    expect(listFactionRelationsByCampaign(db, campaign.id)).toHaveLength(1)
  })
})

describe('factions repository: relation upsert', () => {
  it('rejects self-edges and upserts existing relations', () => {
    const { db, campaign } = seedCampaignWithRegion()
    const { a, lowId, highId } = seedRelationPair(db, campaign.id)
    const relation = createFactionRelation(db, {
      campaignId: campaign.id,
      factionAId: lowId,
      factionBId: highId,
      stance: 'rival',
      summary: 'Harbor bribes'
    })

    expect(() =>
      createFactionRelation(db, {
        campaignId: campaign.id,
        factionAId: a.id,
        factionBId: a.id,
        stance: 'ally'
      })
    ).toThrow(/self/)

    const upserted = upsertFactionRelation(db, {
      campaignId: campaign.id,
      factionAId: highId,
      factionBId: lowId,
      stance: 'war',
      summary: 'Open conflict'
    })
    expect(upserted.id).toBe(relation.id)
    expect(upserted.stance).toBe('war')
    expect(listFactionRelationsByCampaign(db, campaign.id)).toHaveLength(1)
  })
})

function seedReputationFixture() {
  const { db, campaign } = seedCampaignWithRegion()
  const faction = createFaction(db, {
    campaignId: campaign.id,
    key: 'watch',
    name: 'City Watch',
    kind: 'civic',
    summary: 'Keeps order.',
    sortOrder: 0,
    source: 'campaign_create'
  })
  const charA = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Aria',
    characterClass: 'rogue',
    kind: 'player',
    portraitPath: '/a.png',
    sheetBackgroundPath: '/a-sheet.png'
  })
  const charB = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Bram',
    characterClass: 'fighter',
    kind: 'player',
    portraitPath: '/b.png',
    sheetBackgroundPath: '/b-sheet.png'
  })
  return { db, faction, charA, charB }
}

describe('character faction reputation', () => {
  it('upserts from zero, clamps score/delta, and isolates by character', () => {
    const { db, faction, charA, charB } = seedReputationFixture()

    expect(getCharacterFactionReputation(db, charA.id, faction.id)).toBeUndefined()

    const first = applyCharacterFactionReputationDelta(db, {
      characterId: charA.id,
      factionId: faction.id,
      delta: 30,
      reason: 'Helped patrol'
    })
    expect(first.score).toBe(25)
    expect(first.band).toBe('friendly')
    expect(first.lastReason).toBe('Helped patrol')

    applyCharacterFactionReputationDelta(db, {
      characterId: charA.id,
      factionId: faction.id,
      delta: -200,
      reason: 'Burned barracks'
    })
    const afterClamp = getCharacterFactionReputation(db, charA.id, faction.id)
    expect(afterClamp?.score).toBe(0)
    expect(afterClamp?.band).toBe('neutral')

    applyCharacterFactionReputationDelta(db, {
      characterId: charB.id,
      factionId: faction.id,
      delta: -25,
      reason: 'Insulted captain'
    })
    expect(getCharacterFactionReputation(db, charA.id, faction.id)?.score).toBe(0)
    expect(getCharacterFactionReputation(db, charB.id, faction.id)?.score).toBe(-25)
    expect(getCharacterFactionReputation(db, charB.id, faction.id)?.band).toBe('unfriendly')

    const listed = listCharacterFactionReputations(db, charA.id)
    expect(listed).toHaveLength(1)
    expect(listed[0]?.factionId).toBe(faction.id)
  })
})

function seedNpcFactionMembershipFixture() {
  const { db, campaign, region } = seedCampaignWithRegion()
  const deity = createDeity(db, {
    campaignId: campaign.id,
    name: 'Sereth',
    epithet: 'Hollow Flame',
    domains: ['fire'],
    tenets: ['Tend coal'],
    blurb: 'Hearth power.',
    isForgotten: true,
    sortOrder: 0
  })
  const faction = createFaction(db, {
    campaignId: campaign.id,
    key: 'ash-cult',
    name: 'Ash Cult',
    kind: 'religious',
    summary: 'Forgotten fire.',
    deityId: deity.id,
    sortOrder: 0,
    source: 'campaign_create'
  })
  const npc = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: 'Acolyte Mira',
    role: 'acolyte',
    disposition: 'wary',
    factionId: faction.id,
    factionMembershipRole: 'acolyte',
    deityId: deity.id
  })
  return { db, campaign, deity, faction, npc }
}

describe('npc faction and deity fields', () => {
  it('sets membership, deity link, and finds divine manifestation', () => {
    const { db, campaign, deity, faction, npc } = seedNpcFactionMembershipFixture()
    expect(npc.factionId).toBe(faction.id)
    expect(npc.factionMembershipRole).toBe('acolyte')
    expect(npc.deityId).toBe(deity.id)
    expect(npc.isDivineManifestation).toBe(false)

    setNpcFactionMembership(db, npc.id, {
      factionId: null,
      membershipRole: null
    })
    expect(getNpcById(db, npc.id)?.factionId).toBeNull()

    updateNpcFactionFields(db, npc.id, {
      factionId: faction.id,
      factionMembershipRole: 'high priest',
      deityId: deity.id,
      isDivineManifestation: true
    })
    const manifestation = findDivineManifestationNpc(db, campaign.id, deity.id)
    expect(manifestation?.id).toBe(npc.id)
    expect(manifestation?.isDivineManifestation).toBe(true)
  })
})
