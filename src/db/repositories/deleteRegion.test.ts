import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testUtils'
import { createCampaign } from './campaigns'
import { createCharacter } from './characters'
import { appendNpcMemory } from './npcMemories'
import { createNpc } from './npcs'
import { createQuest } from './quests'
import { createRegionHistoryEntry } from './regionHistory'
import { createRegion, getRegionById, listRegionsByCampaign } from './regions'
import { createWorldFact } from './worldFacts'
import { deleteRegionCascade } from './deleteRegion'

function countRows(db: ReturnType<typeof createTestDb>, sql: string, id: string): number {
  return (db.prepare(sql).get(id) as { count: number }).count
}

function expectRegionFullyRemoved(db: ReturnType<typeof createTestDb>, regionId: string): void {
  expect(getRegionById(db, regionId)).toBeUndefined()
  expect(countRows(db, 'SELECT COUNT(*) as count FROM npcs WHERE region_id = ?', regionId)).toBe(0)
  expect(
    countRows(db, 'SELECT COUNT(*) as count FROM region_history WHERE region_id = ?', regionId)
  ).toBe(0)
  expect(
    countRows(db, 'SELECT COUNT(*) as count FROM world_facts WHERE region_id = ?', regionId)
  ).toBe(0)
  expect(countRows(db, 'SELECT COUNT(*) as count FROM quests WHERE region_id = ?', regionId)).toBe(0)
}

function seedRegionFootprint(db: ReturnType<typeof createTestDb>, label: string) {
  const campaign = createCampaign(db, {
    name: `${label} Campaign`,
    premisePrompt: 'A test premise.',
    deathMode: 'legendary'
  })
  const region = createRegion(db, {
    campaignId: campaign.id,
    name: `${label} Region`,
    description: `${label} overview`
  })
  createRegionHistoryEntry(db, { regionId: region.id, inGameDate: 0, content: `${label} history` })
  const worldFact = createWorldFact(db, {
    campaignId: campaign.id,
    regionId: region.id,
    factionTag: 'quest_hook',
    content: `${label} hook`
  })
  const quest = createQuest(db, {
    campaignId: campaign.id,
    kind: 'side',
    title: `${label} Quest`,
    summary: 'Side quest',
    regionId: region.id,
    sourceWorldFactId: worldFact.id,
    scale: 'minor'
  })
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
    sourceNpcId: npc.id
  })
  return { campaign, region, npc, quest, character, worldFact }
}

describe('deleteRegionCascade', () => {
  it('removes the region and every dependent row without touching other regions', () => {
    const db = createTestDb()
    const target = seedRegionFootprint(db, 'Target')
    const other = seedRegionFootprint(db, 'Other')

    deleteRegionCascade(db, target.region.id)

    expectRegionFullyRemoved(db, target.region.id)
    expect(listRegionsByCampaign(db, target.campaign.id)).toHaveLength(1)
    expect(listRegionsByCampaign(db, other.campaign.id)).toHaveLength(1)
    expect(
      countRows(
        db,
        'SELECT COUNT(*) as count FROM character_quests WHERE quest_id = ?',
        target.quest.id
      )
    ).toBe(0)

    const clearedCharacter = db
      .prepare('SELECT source_npc_id FROM characters WHERE id = ?')
      .get(target.character.id) as { source_npc_id: string | null }
    expect(clearedCharacter.source_npc_id).toBeNull()

    expect(getRegionById(db, other.region.id)?.name).toBe('Other Region')
    expect(
      countRows(db, 'SELECT COUNT(*) as count FROM npcs WHERE region_id = ?', other.region.id)
    ).toBe(1)
  })

  it('rejects regions that do not exist', () => {
    const db = createTestDb()
    expect(() => deleteRegionCascade(db, 'missing-region')).toThrow(/not found/i)
  })
})
