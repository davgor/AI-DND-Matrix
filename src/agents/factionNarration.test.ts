import type Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createDeity } from '../db/repositories/deities'
import {
  createFaction,
  getCharacterFactionReputation,
  getFactionByKey,
  listFactionRelationsByCampaign,
  listFactionsByCampaign
} from '../db/repositories/factions'
import { createNpc, getNpcById } from '../db/repositories/npcs'
import { createRegion } from '../db/repositories/regions'
import { getCampaignDetail } from '../main/campaignIpc'
import type { FactionProposal } from '../shared/factions'
import { persistNarrationSideEffects } from './dm'
import { persistFactionNarrationSideEffects } from './factionNarration'
import { createScriptedProvider } from './providers/mockHarness'

function seedScene(db: Database.Database) {
  const campaign = createCampaign(db, {
    name: 'Intrigue',
    premisePrompt: 'Courts and cults',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Harbor',
    description: 'Busy docks'
  })
  const hero = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Aria',
    characterClass: 'rogue',
    kind: 'player'
  })
  const rival = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Bram',
    characterClass: 'fighter',
    kind: 'player'
  })
  return { campaign, region, hero, rival }
}

function applyFactionEffects(
  db: Database.Database,
  campaignId: string,
  characterId: string,
  result: Parameters<typeof persistFactionNarrationSideEffects>[1]
): void {
  persistFactionNarrationSideEffects(db, result, { campaignId, characterId })
}

function seedFaction(
  db: Database.Database,
  campaignId: string,
  input: { key: string; name: string; kind: FactionProposal['kind']; summary: string; sortOrder: number }
) {
  return createFaction(db, {
    campaignId,
    ...input,
    source: 'campaign_create'
  })
}

describe('persistFactionNarrationSideEffects mint', () => {
  it('mints with dm_play source and skips duplicate keys', () => {
    const db = createTestDb()
    const { campaign, region, hero } = seedScene(db)
    const proposal: FactionProposal = {
      key: 'dock-smugglers',
      name: 'Dock Smugglers',
      kind: 'criminal',
      summary: 'Controls the night berths.',
      homeRegionId: region.id
    }
    applyFactionEffects(db, campaign.id, hero.id, {
      narrationText: 'A new guild emerges.',
      factionProposals: [proposal]
    })
    expect(getFactionByKey(db, campaign.id, 'dock-smugglers')?.source).toBe('dm_play')
    expect(listFactionsByCampaign(db, campaign.id)).toHaveLength(1)
    applyFactionEffects(db, campaign.id, hero.id, {
      narrationText: 'Replay.',
      factionProposals: [{ ...proposal, name: 'Renamed', summary: 'noop' }]
    })
    expect(listFactionsByCampaign(db, campaign.id)).toHaveLength(1)
    expect(getFactionByKey(db, campaign.id, 'dock-smugglers')?.name).toBe('Dock Smugglers')
  })

  it('nulls unknown optional deity/region FKs instead of throwing', () => {
    const db = createTestDb()
    const { campaign, hero } = seedScene(db)
    applyFactionEffects(db, campaign.id, hero.id, {
      narrationText: 'A cult forms.',
      factionProposals: [
        {
          key: 'ash-cult',
          name: 'Ash Cult',
          kind: 'religious',
          summary: 'Forgotten fire.',
          deityId: 'missing-deity',
          homeRegionId: 'missing-region'
        }
      ]
    })
    const minted = getFactionByKey(db, campaign.id, 'ash-cult')
    expect(minted?.deityId).toBeNull()
    expect(minted?.homeRegionId).toBeNull()
  })
})

describe('persistFactionNarrationSideEffects reputation', () => {
  it('applies delta only for the active PC and clamps magnitude', () => {
    const db = createTestDb()
    const { campaign, hero, rival } = seedScene(db)
    const watch = seedFaction(db, campaign.id, {
      key: 'city-watch',
      name: 'City Watch',
      kind: 'civic',
      summary: 'Keeps order.',
      sortOrder: 0
    })
    applyFactionEffects(db, campaign.id, hero.id, {
      narrationText: 'You aided the watch.',
      reputationUpdates: [
        { characterId: hero.id, factionKey: 'city-watch', delta: 40, reason: 'Helped patrol' },
        { characterId: rival.id, factionId: watch.id, delta: -10, reason: 'ignored' }
      ]
    })
    expect(getCharacterFactionReputation(db, hero.id, watch.id)?.score).toBe(25)
    expect(getCharacterFactionReputation(db, rival.id, watch.id)).toBeUndefined()
  })

  it('rejects unknown faction FKs for reputation updates', () => {
    const db = createTestDb()
    const { campaign, hero } = seedScene(db)
    applyFactionEffects(db, campaign.id, hero.id, {
      narrationText: 'Ghost faction.',
      reputationUpdates: [
        { characterId: hero.id, factionId: 'missing', delta: 5 },
        { characterId: hero.id, factionKey: 'also-missing', delta: 5 }
      ]
    })
    expect(listFactionsByCampaign(db, campaign.id)).toHaveLength(0)
  })
})

describe('persistFactionNarrationSideEffects relations', () => {
  it('upserts canonical stance and rejects unknown FKs', () => {
    const db = createTestDb()
    const { campaign, hero } = seedScene(db)
    const court = seedFaction(db, campaign.id, {
      key: 'harbor-court',
      name: 'Harbor Court',
      kind: 'political',
      summary: 'Nobles.',
      sortOrder: 0
    })
    const guild = seedFaction(db, campaign.id, {
      key: 'dock-guild',
      name: 'Dock Guild',
      kind: 'mercantile',
      summary: 'Berths.',
      sortOrder: 1
    })
    applyFactionEffects(db, campaign.id, hero.id, {
      narrationText: 'Tensions rise.',
      relationUpdates: [
        { factionAKey: 'dock-guild', factionBKey: 'harbor-court', stance: 'rival' },
        { factionAId: court.id, factionBId: 'missing', stance: 'war' }
      ]
    })
    const relations = listFactionRelationsByCampaign(db, campaign.id)
    expect(relations).toHaveLength(1)
    expect(relations[0]?.stance).toBe('rival')
    applyFactionEffects(db, campaign.id, hero.id, {
      narrationText: 'War.',
      relationUpdates: [{ factionAId: court.id, factionBId: guild.id, stance: 'war' }]
    })
    expect(listFactionRelationsByCampaign(db, campaign.id)[0]?.id).toBe(relations[0]?.id)
    expect(listFactionRelationsByCampaign(db, campaign.id)[0]?.stance).toBe('war')
  })
})

describe('persistFactionNarrationSideEffects npc membership', () => {
  it('clears unknown keys and sets valid membership', () => {
    const db = createTestDb()
    const { campaign, region, hero } = seedScene(db)
    const cult = seedFaction(db, campaign.id, {
      key: 'ash-cult',
      name: 'Ash Cult',
      kind: 'religious',
      summary: 'Fire.',
      sortOrder: 0
    })
    const npc = createNpc(db, {
      campaignId: campaign.id,
      regionId: region.id,
      name: 'Mira',
      role: 'acolyte',
      disposition: 'wary',
      factionId: cult.id,
      factionMembershipRole: 'acolyte'
    })
    applyFactionEffects(db, campaign.id, hero.id, {
      narrationText: 'Leaves.',
      npcFactionUpdates: [{ npcId: npc.id, factionKey: 'ghost-cult', membershipRole: 'spy' }]
    })
    expect(getNpcById(db, npc.id)?.factionId).toBeNull()
    applyFactionEffects(db, campaign.id, hero.id, {
      narrationText: 'Rejoins.',
      npcFactionUpdates: [{ npcId: npc.id, factionKey: 'ash-cult', membershipRole: 'informant' }]
    })
    expect(getNpcById(db, npc.id)?.factionId).toBe(cult.id)
    expect(getNpcById(db, npc.id)?.factionMembershipRole).toBe('informant')
  })
})

describe('persistNarrationSideEffects faction proposals', () => {
  it('persists mint + reputation and exposes factions on detail', async () => {
    const db = createTestDb()
    const { campaign, region, hero } = seedScene(db)
    createDeity(db, {
      campaignId: campaign.id,
      name: 'Vhalor',
      epithet: 'the Drowned',
      domains: ['tides'],
      tenets: ['Keep oaths'],
      blurb: 'Tide judge.',
      isForgotten: false,
      sortOrder: 0
    })
    await persistNarrationSideEffects(
      db,
      {
        narrationText: 'The tide temple claims you.',
        factionProposals: [
          {
            key: 'tide-temple',
            name: 'Tide Temple',
            kind: 'religious',
            summary: 'Clergy of the drowned judge.',
            deityKey: 'vhalor',
            homeRegionId: region.id
          }
        ],
        reputationUpdates: [
          { characterId: hero.id, factionKey: 'tide-temple', delta: 10, reason: 'Oath kept' }
        ]
      },
      {
        campaignId: campaign.id,
        regionId: region.id,
        characterId: hero.id,
        provider: createScriptedProvider([])
      }
    )
    const detail = getCampaignDetail(db, campaign.id)
    expect(detail.factions.find((f) => f.key === 'tide-temple')?.source).toBe('dm_play')
    const temple = getFactionByKey(db, campaign.id, 'tide-temple')!
    expect(getCharacterFactionReputation(db, hero.id, temple.id)?.score).toBe(10)
  })
})
