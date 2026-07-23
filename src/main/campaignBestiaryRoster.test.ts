import type Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/testUtils'
import { createCampaign } from '../db/repositories/campaigns'
import { createBestiarySpecies } from '../db/repositories/bestiary'
import { CREATURE_SEEDS_V1 } from '../db/catalog/seeds/creatures'
import { buildCampaignBestiaryRoster } from './campaignBestiaryRoster'
import { getCampaignDetail } from './campaignIpc'

function seedCampaign(db: Database.Database = createTestDb()) {
  const campaign = createCampaign(db, {
    name: 'Bestiary Roster',
    premisePrompt: 'Beasts and catalogs.',
    deathMode: 'standard'
  })
  return { db, campaign }
}

describe('buildCampaignBestiaryRoster', () => {
  it('includes catalog seed defaults when the campaign has no species', () => {
    const { db, campaign } = seedCampaign()
    const roster = buildCampaignBestiaryRoster(db, campaign.id)
    expect(roster.some((entry) => entry.origin === 'default')).toBe(true)
    expect(roster.filter((entry) => entry.origin === 'default').length).toBe(CREATURE_SEEDS_V1.length)
    expect(roster.every((entry) => entry.origin === 'default')).toBe(true)
  })

  it('marks campaign species as campaign and dedupes matching catalog keys', () => {
    const { db, campaign } = seedCampaign()
    createBestiarySpecies(db, {
      campaignId: campaign.id,
      key: 'goblin-scout',
      name: 'Goblin Scout',
      baseLore: 'Local goblin scouts haunt the ridge.',
      visualAppearance: null,
      buckets: ['goblinoid'],
      tags: ['raider'],
      defaultCatalogKey: 'goblin-scout',
      variants: [{ variantKey: 'standard' }]
    })
    const roster = buildCampaignBestiaryRoster(db, campaign.id)
    const goblins = roster.filter((entry) => entry.species.key === 'goblin-scout')
    expect(goblins).toHaveLength(1)
    expect(goblins[0]?.origin).toBe('campaign')
    expect(roster.filter((entry) => entry.origin === 'campaign')).toHaveLength(1)
    expect(roster.filter((entry) => entry.origin === 'default').length).toBe(CREATURE_SEEDS_V1.length - 1)
  })
})

describe('getCampaignDetail bestiary roster', () => {
  it('returns the merged roster on campaign detail', () => {
    const { db, campaign } = seedCampaign()
    const detail = getCampaignDetail(db, campaign.id)
    expect(detail.bestiary.length).toBe(CREATURE_SEEDS_V1.length)
    expect(detail.bestiary[0]?.origin).toBeDefined()
  })
})
