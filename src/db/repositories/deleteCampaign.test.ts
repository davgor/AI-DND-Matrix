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
import { deleteCampaignCascade } from './deleteCampaign'

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
  const row = db
    .prepare(`SELECT COUNT(*) as count FROM ${table} WHERE campaign_id = ?`)
    .get(campaignId) as { count: number }
  return row.count
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
  createCharacter(db, {
    campaignId: campaign.id,
    name: `${label} Hero`,
    characterClass: 'fighter',
    kind: 'player',
    portraitPath: `/tmp/${label}-portrait.png`,
    sheetBackgroundPath: `/tmp/${label}-sheet.png`
  })
  createSaveSnapshot(db, campaign.id)
  createWorldFact(db, { campaignId: campaign.id, content: 'Fact', regionId: region.id })
  createStoryThread(db, { campaignId: campaign.id, title: 'Thread', state: 'open' })
  appendEvent(db, { campaignId: campaign.id, type: 'player_action', payload: { test: true } })
  touchLastPlayed(db, campaign.id)
  return campaign
}

describe('deleteCampaignCascade', () => {
  it('removes every campaign-scoped row across all listed tables', () => {
    const db = createTestDb()
    const target = seedCampaignFootprint(db, 'Target')
    const other = seedCampaignFootprint(db, 'Other')

    deleteCampaignCascade(db, target.id)

    expect(getCampaignById(db, target.id)).toBeUndefined()
    for (const table of [
      'regions',
      'npcs',
      'characters',
      'saves',
      'world_facts',
      'story_threads',
      'events',
      'sessions'
    ]) {
      expect(countForCampaign(db, table, target.id)).toBe(0)
    }
    expect(countForCampaign(db, 'region_history', target.id)).toBe(0)
    expect(countForCampaign(db, 'npc_memories', target.id)).toBe(0)

    expect(getCampaignById(db, other.id)?.name).toBe('Other')
    expect(countForCampaign(db, 'characters', other.id)).toBe(1)
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
  })
})
