import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { ensureDeityManifestationNpc } from './deityManifestation'
import { persistFactionNarrationSideEffects } from './factionNarration'
import { closeFileTestDb, openFileTestDb, reopenFileTestDb } from '../db/fileDbTestUtils'
import { runMigrations } from '../db/migrations'
import {
  createCampaign,
  getCampaignById,
  updateCampaignFactionPressure
} from '../db/repositories/campaigns'
import { createCharacter } from '../db/repositories/characters'
import { createDeity } from '../db/repositories/deities'
import type { Faction } from '../shared/factions/types'
import {
  applyCharacterFactionReputationDelta,
  createFaction,
  createFactionRelation,
  findDivineManifestationNpc,
  getCharacterFactionReputation,
  listFactionRelationsByCampaign,
  listFactionsByCampaign
} from '../db/repositories/factions'
import { createRegion } from '../db/repositories/regions'
import { migrations } from '../db/schema'
import { FACTION_PRESSURE_BANDS } from '../shared/factions'

const INTRIGUE_FACTION_SPECS = [
  { key: 'harbor-court', name: 'Harbor Court', kind: 'political' as const, deityId: null },
  { key: 'tide-temple', name: 'Tide Temple', kind: 'religious' as const, deityId: null as string | null },
  { key: 'salt-smugglers', name: 'Salt Smugglers', kind: 'criminal' as const, deityId: null },
  { key: 'dock-watch', name: 'Dock Watch', kind: 'civic' as const, deityId: null },
  { key: 'chart-house', name: 'Chart House', kind: 'mercantile' as const, deityId: null },
  { key: 'storm-militia', name: 'Storm Militia', kind: 'military' as const, deityId: null },
  { key: 'shadow-cabal', name: 'Shadow Cabal', kind: 'clandestine' as const, deityId: null }
]

function createIntrigueFactions(
  db: Database.Database,
  campaignId: string,
  deityId: string
): Record<string, Faction> {
  return Object.fromEntries(
    INTRIGUE_FACTION_SPECS.map((spec, index) => {
      const resolvedDeityId = spec.key === 'tide-temple' ? deityId : spec.deityId
      return [
        spec.key,
        createFaction(db, {
          campaignId,
          key: spec.key,
          name: spec.name,
          kind: spec.kind,
          summary: `${spec.name} summary.`,
          deityId: resolvedDeityId,
          sortOrder: index,
          source: 'campaign_create'
        })
      ]
    })
  )
}

function wireIntrigueRelations(
  db: Database.Database,
  campaignId: string,
  byKey: Record<string, Faction>
): void {
  createFactionRelation(db, {
    campaignId,
    factionAId: byKey['harbor-court']!.id,
    factionBId: byKey['salt-smugglers']!.id,
    stance: 'rival',
    summary: 'Bribes vs decrees'
  })
  createFactionRelation(db, {
    campaignId,
    factionAId: byKey['tide-temple']!.id,
    factionBId: byKey['salt-smugglers']!.id,
    stance: 'tense',
    summary: 'Smugglers dodge tithes'
  })
  createFactionRelation(db, {
    campaignId,
    factionAId: byKey['harbor-court']!.id,
    factionBId: byKey['tide-temple']!.id,
    stance: 'ally',
    summary: 'Shared harbor rites'
  })
  createFactionRelation(db, {
    campaignId,
    factionAId: byKey['harbor-court']!.id,
    factionBId: byKey['shadow-cabal']!.id,
    stance: 'secret',
    summary: 'Hidden pact'
  })
}

function seedHeavyIntrigue(db: Database.Database) {
  const campaign = createCampaign(db, {
    name: 'Intrigue Path',
    premisePrompt: 'Courts and temples scheme in the capital.',
    deathMode: 'legendary',
    factionsSummary: 'Nobles and faiths contest the harbor.',
    factionPressure: 'heavy'
  })
  updateCampaignFactionPressure(db, campaign.id, 'heavy')
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: 'Capital Docks',
    description: 'Where bribes and blessings trade hands.'
  })
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
  const byKey = createIntrigueFactions(db, campaign.id, deity.id)
  wireIntrigueRelations(db, campaign.id, byKey)
  const hero = createCharacter(db, {
    campaignId: campaign.id,
    name: 'Aria',
    characterClass: 'rogue',
    kind: 'player'
  })
  return {
    campaign,
    region,
    deity,
    guild: byKey['salt-smugglers']!,
    temple: byKey['tide-temple']!,
    hero
  }
}

function assertHeavyIntrigueRoster(
  db: Database.Database,
  campaignId: string,
  deityId: string
): void {
  const band = FACTION_PRESSURE_BANDS.heavy
  const factions = listFactionsByCampaign(db, campaignId)
  expect(factions.length).toBeGreaterThanOrEqual(band.minFactions)
  expect(factions.length).toBeLessThanOrEqual(band.maxFactions)
  expect(factions.some((f) => f.kind === 'religious' && f.deityId === deityId)).toBe(true)
  expect(listFactionRelationsByCampaign(db, campaignId).length).toBeGreaterThanOrEqual(
    band.minRelations
  )
}

function applyIntrigueReputationDeltas(
  db: Database.Database,
  heroId: string,
  guildId: string,
  templeId: string
): void {
  const guildStanding = applyCharacterFactionReputationDelta(db, {
    characterId: heroId,
    factionId: guildId,
    delta: 25,
    reason: 'Aided smugglers against a court audit'
  })
  expect(guildStanding.score).toBe(25)
  expect(guildStanding.band).toBe('friendly')
  const templeStanding = applyCharacterFactionReputationDelta(db, {
    characterId: heroId,
    factionId: templeId,
    delta: -25,
    reason: 'Desecrated a tide shrine'
  })
  expect(templeStanding.score).toBe(-25)
  expect(templeStanding.band).toBe('unfriendly')
}

function assertManifestationReuse(
  first: Awaited<ReturnType<typeof ensureDeityManifestationNpc>>,
  second: Awaited<ReturnType<typeof ensureDeityManifestationNpc>>
): void {
  expect(first.status).toBe('created')
  expect(second.status).toBe('reused')
  if (first.status !== 'created' || second.status !== 'reused') {
    throw new Error('expected create then reuse')
  }
  expect(second.npc.id).toBe(first.npc.id)
}

function assertIntrigueSurvivesReopen(
  db: Database.Database,
  ids: {
    campaignId: string
    heroId: string
    guildId: string
    templeId: string
    deityId: string
    manifestationId: string
  }
): void {
  expect(getCampaignById(db, ids.campaignId)?.factionPressure).toBe('heavy')
  expect(listFactionsByCampaign(db, ids.campaignId).some((f) => f.key === 'night-ledger')).toBe(true)
  expect(listFactionRelationsByCampaign(db, ids.campaignId).length).toBeGreaterThanOrEqual(4)
  expect(getCharacterFactionReputation(db, ids.heroId, ids.guildId)?.band).toBe('friendly')
  expect(getCharacterFactionReputation(db, ids.heroId, ids.guildId)?.score).toBe(25)
  expect(getCharacterFactionReputation(db, ids.heroId, ids.templeId)?.band).toBe('unfriendly')
  expect(getCharacterFactionReputation(db, ids.heroId, ids.templeId)?.score).toBe(-25)
  expect(findDivineManifestationNpc(db, ids.campaignId, ids.deityId)?.id).toBe(ids.manifestationId)
}

function runIntriguePersistenceScenario(db: Database.Database): {
  ids: {
    campaignId: string
    heroId: string
    guildId: string
    templeId: string
    deityId: string
    manifestationId: string
  }
} {
  const { campaign, region, deity, guild, temple, hero } = seedHeavyIntrigue(db)
  assertHeavyIntrigueRoster(db, campaign.id, deity.id)
  applyIntrigueReputationDeltas(db, hero.id, guild.id, temple.id)
  const first = ensureDeityManifestationNpc(db, {
    campaignId: campaign.id,
    proposal: { deityId: deity.id, regionId: region.id },
    fallbackRegionId: region.id
  })
  const second = ensureDeityManifestationNpc(db, {
    campaignId: campaign.id,
    proposal: { deityId: deity.id },
    fallbackRegionId: region.id
  })
  assertManifestationReuse(first, second)
  persistFactionNarrationSideEffects(
    db,
    {
      narrationText: 'The cabal marks you as useful.',
      factionProposals: [
        {
          key: 'night-ledger',
          name: 'Night Ledger',
          kind: 'clandestine',
          summary: 'Minted mid-play intrigue cell.'
        }
      ]
    },
    { campaignId: campaign.id, characterId: hero.id }
  )
  return {
    ids: {
      campaignId: campaign.id,
      heroId: hero.id,
      guildId: guild.id,
      templeId: temple.id,
      deityId: deity.id,
      manifestationId: first.status === 'created' ? first.npc.id : ''
    }
  }
}

describe('125.9 intrigue playpath persistence', () => {
  let dir: string | undefined
  let db: Database.Database | undefined

  afterEach(() => {
    closeFileTestDb(db)
    db = undefined
    if (dir) {
      rmSync(dir, { recursive: true, force: true })
      dir = undefined
    }
  })

  it('keeps heavy pressure, relations, reputation, and manifestation across reopen', () => {
    dir = mkdtempSync(join(tmpdir(), 'faction-intrigue-'))
    db = openFileTestDb(join(dir, 'save.sqlite'))
    runMigrations(db, migrations)

    const { ids } = runIntriguePersistenceScenario(db)

    db = reopenFileTestDb(db)
    assertIntrigueSurvivesReopen(db, ids)
  })
})
