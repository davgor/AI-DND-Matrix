import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign, getCampaignById } from './campaigns'
import { createCharacter } from './characters'
import { appendEvent } from './events'
import { appendNpcMemory } from './npcMemories'
import { createNpc } from './npcs'
import { createRegionHistoryEntry } from './regionHistory'
import { createRegion } from './regions'
import { createSaveSnapshot } from './saves'
import { touchLastPlayed } from './sessions'
import { createStoryThread } from './storyThreads'
import { createWorldFact } from './worldFacts'
import { createCampaignRace } from './campaignRaces'
import { createDeity } from './deities'
import { deleteCampaignCascade } from './deleteCampaign'

const SAMPLE_RACE_LORE = {
  summary: 'Humans are widespread.',
  appearance: 'Varied builds and features.',
  culture: 'Ambitious and adaptable.',
  roleInThisLand: 'Settlers and traders.',
  hooks: ['A frontier town grows.', 'Old bloodlines feud.']
}

function countForCampaign(db: ReturnType<typeof createTestDb>, table: string, campaignId: string): number {
  if (table === 'region_history') {
    return (
      db
        .prepare(
          `SELECT COUNT(*) as count FROM region_history
           WHERE region_id IN (SELECT id FROM regions WHERE campaign_id = ?)`
        )
        .get(campaignId) as { count: number }
    ).count
  }
  if (table === 'npc_memories') {
    return (
      db
        .prepare(
          `SELECT COUNT(*) as count FROM npc_memories
           WHERE npc_id IN (SELECT id FROM npcs WHERE campaign_id = ?)`
        )
        .get(campaignId) as { count: number }
    ).count
  }
  if (table === 'character_items') {
    return (
      db
        .prepare(
          `SELECT COUNT(*) as count FROM character_items
           WHERE character_id IN (SELECT id FROM characters WHERE campaign_id = ?)`
        )
        .get(campaignId) as { count: number }
    ).count
  }
  const row = db
    .prepare(`SELECT COUNT(*) as count FROM ${table} WHERE campaign_id = ?`)
    .get(campaignId) as { count: number }
  return row.count
}

function seedDeityForCampaign(db: ReturnType<typeof createTestDb>, campaignId: string, label: string): void {
  createDeity(db, {
    campaignId,
    name: `${label} God`,
    epithet: 'the Tested',
    domains: ['trials'],
    tenets: ['Endure', 'Witness'],
    blurb: 'A test deity.',
    isForgotten: false,
    sortOrder: 0
  })
}

function seedCampaignFootprint(db: ReturnType<typeof createTestDb>, label: string) {
  const campaign = createCampaign(db, {
    name: label,
    premisePrompt: 'A test premise.',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: `${label} Region`,
    description: 'Description'
  })
  createRegionHistoryEntry(db, { regionId: region.id, inGameDate: 0, content: 'History' })
  const npc = createNpc(db, {
    campaignId: campaign.id,
    regionId: region.id,
    name: `${label} NPC`,
    role: 'guide',
    disposition: 'friendly'
  })
  appendNpcMemory(db, { npcId: npc.id, content: 'Memory', tags: ['test'] })
  const character = createCharacter(db, {
    campaignId: campaign.id,
    name: `${label} Hero`,
    characterClass: 'fighter',
    kind: 'player',
    portraitPath: `/tmp/${label}-portrait.png`,
    sheetBackgroundPath: `/tmp/${label}-sheet.png`
  })
  createCampaignRace(db, {
    campaignId: campaign.id,
    raceKey: 'human',
    kind: 'preset',
    label: 'Human',
    seedPrompt: 'Versatile ancestry.',
    lore: SAMPLE_RACE_LORE,
    createdByCharacterId: character.id
  })
  seedDeityForCampaign(db, campaign.id, label)
  createSaveSnapshot(db, campaign.id)
  createWorldFact(db, { campaignId: campaign.id, content: 'Fact', regionId: region.id })
  createStoryThread(db, { campaignId: campaign.id, title: 'Thread', state: 'open' })
  appendEvent(db, { campaignId: campaign.id, type: 'player_action', payload: { test: true } })
  touchLastPlayed(db, campaign.id)
  return campaign
}

function expectCampaignFullyDeleted(db: ReturnType<typeof createTestDb>, campaignId: string): void {
  expect(getCampaignById(db, campaignId)).toBeUndefined()
  for (const table of [
    'regions',
    'npcs',
    'characters',
    'saves',
    'world_facts',
    'story_threads',
    'events',
    'sessions',
    'campaign_races',
    'deities'
  ]) {
    expect(countForCampaign(db, table, campaignId)).toBe(0)
  }
  expect(countForCampaign(db, 'region_history', campaignId)).toBe(0)
  expect(countForCampaign(db, 'npc_memories', campaignId)).toBe(0)
  expect(countForCampaign(db, 'character_items', campaignId)).toBe(0)
}

describe('deleteCampaignCascade', () => {
  it('removes every campaign-scoped row across all listed tables', () => {
    const db = createTestDb()
    const target = seedCampaignFootprint(db, 'Target')
    const other = seedCampaignFootprint(db, 'Other')

    deleteCampaignCascade(db, target.id)

    expectCampaignFullyDeleted(db, target.id)

    expect(getCampaignById(db, other.id)?.name).toBe('Other')
    expect(countForCampaign(db, 'characters', other.id)).toBe(1)
    expect(countForCampaign(db, 'campaign_races', other.id)).toBe(1)
    expect(countForCampaign(db, 'deities', other.id)).toBe(1)
  })

  it('succeeds when foreign keys are enforced (post-migration connection state)', () => {
    const db = createTestDb()
    db.pragma('foreign_keys = ON')
    const target = seedCampaignFootprint(db, 'FkEnforced')

    expect(() => deleteCampaignCascade(db, target.id)).not.toThrow()
    expect(getCampaignById(db, target.id)).toBeUndefined()
    expect(countForCampaign(db, 'campaign_races', target.id)).toBe(0)
    expect(countForCampaign(db, 'deities', target.id)).toBe(0)
  })

  it('rolls back when a forced mid-delete failure occurs', () => {
    const db = createTestDb()
    const target = seedCampaignFootprint(db, 'Rollback')

    expect(() =>
      deleteCampaignCascade(db, target.id, {
        beforeCommit: () => {
          throw new Error('forced failure')
        }
      })
    ).toThrow('forced failure')

    expect(getCampaignById(db, target.id)?.name).toBe('Rollback')
    expect(countForCampaign(db, 'characters', target.id)).toBe(1)
    expect(countForCampaign(db, 'events', target.id)).toBe(1)
    expect(countForCampaign(db, 'campaign_races', target.id)).toBe(1)
    expect(countForCampaign(db, 'deities', target.id)).toBe(1)
  })
})
