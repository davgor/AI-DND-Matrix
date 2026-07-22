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
import { createBestiarySpecies, setQuestFoeAssignment } from './bestiary'
import { createDeity } from './deities'
import {
  applyCharacterFactionReputationDelta,
  createFaction,
  createFactionRelation
} from './factions'
import { deleteCampaignCascade } from './deleteCampaign'
import { insertLlmUsageEvent } from './llmUsageEvents'
import { createQuest } from './quests'

const SAMPLE_RACE_LORE = {
  summary: 'Humans are widespread.',
  appearance: 'Varied builds and features.',
  culture: 'Ambitious and adaptable.',
  roleInThisLand: 'Settlers and traders.',
  hooks: ['A frontier town grows.', 'Old bloodlines feud.']
}

type TestDb = ReturnType<typeof createTestDb>

function insertTestRagChunk(
  db: TestDb,
  campaignId: string,
  overrides: { id?: string; sourceId?: string } = {}
): void {
  const embedding = Buffer.alloc(256 * 4)
  db.prepare(
    `INSERT INTO rag_chunks (
      id, campaign_id, source_table, source_id, region_id, npc_id, character_id,
      text, content_hash, embedding, updated_at
    ) VALUES (?, ?, 'world_facts', ?, NULL, NULL, NULL, ?, ?, ?, ?)`
  ).run(
    overrides.id ?? `chunk-${campaignId}`,
    campaignId,
    overrides.sourceId ?? `fact-${campaignId}`,
    'Indexed fact chunk.',
    'hash-test',
    embedding,
    '2026-01-01T00:00:00.000Z'
  )
}

function insertTestRagBackfillState(db: TestDb, campaignId: string): void {
  db.prepare(
    `INSERT INTO rag_backfill_state (campaign_id, completed_at, updated_at) VALUES (?, NULL, ?)`
  ).run(campaignId, '2026-01-01T00:00:00.000Z')
}

const NESTED_COUNT_SQL: Record<string, string> = {
  region_history: `SELECT COUNT(*) as count FROM region_history
           WHERE region_id IN (SELECT id FROM regions WHERE campaign_id = ?)`,
  npc_memories: `SELECT COUNT(*) as count FROM npc_memories
           WHERE npc_id IN (SELECT id FROM npcs WHERE campaign_id = ?)`,
  character_items: `SELECT COUNT(*) as count FROM character_items
           WHERE character_id IN (SELECT id FROM characters WHERE campaign_id = ?)`,
  bestiary_variants: `SELECT COUNT(*) as count FROM bestiary_variants
           WHERE species_id IN (SELECT id FROM bestiary_species WHERE campaign_id = ?)`,
  quest_foe_assignments: `SELECT COUNT(*) as count FROM quest_foe_assignments
           WHERE quest_id IN (SELECT id FROM quests WHERE campaign_id = ?)`,
  character_faction_reputations: `SELECT COUNT(*) as count FROM character_faction_reputations
           WHERE character_id IN (SELECT id FROM characters WHERE campaign_id = ?)
              OR faction_id IN (SELECT id FROM factions WHERE campaign_id = ?)`
}

function countForCampaign(db: TestDb, table: string, campaignId: string): number {
  const nested = NESTED_COUNT_SQL[table]
  if (table === 'character_faction_reputations') {
    return (db.prepare(nested!).get(campaignId, campaignId) as { count: number }).count
  }
  const sql = nested ?? `SELECT COUNT(*) as count FROM ${table} WHERE campaign_id = ?`
  return (db.prepare(sql).get(campaignId) as { count: number }).count
}

function seedDeityForCampaign(db: TestDb, campaignId: string, label: string): void {
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

function seedRegionNpcAndCharacter(db: TestDb, campaignId: string, label: string) {
  const region = createRegion(db, {
    campaignId,
    name: `${label} Region`,
    description: 'Description'
  })
  createRegionHistoryEntry(db, { regionId: region.id, inGameDate: 0, content: 'History' })
  const npc = createNpc(db, {
    campaignId,
    regionId: region.id,
    name: `${label} NPC`,
    role: 'guide',
    disposition: 'friendly'
  })
  appendNpcMemory(db, { npcId: npc.id, content: 'Memory', tags: ['test'] })
  const character = createCharacter(db, {
    campaignId,
    name: `${label} Hero`,
    characterClass: 'fighter',
    kind: 'player',
    portraitPath: `/tmp/${label}-portrait.png`,
    sheetBackgroundPath: `/tmp/${label}-sheet.png`
  })
  return { region, character }
}

function seedBestiaryAndQuest(db: TestDb, campaignId: string, label: string): void {
  const species = createBestiarySpecies(db, {
    campaignId,
    key: `${label.toLowerCase()}-beast`,
    name: `${label} Beast`,
    baseLore: 'A test bestiary species.',
    buckets: ['beast'],
    tags: ['test'],
    variants: [{ variantKey: 'standard' }]
  })
  const quest = createQuest(db, {
    campaignId,
    kind: 'side',
    title: `${label} Quest`,
    summary: 'Clear the beasts.',
    scale: 'minor'
  })
  setQuestFoeAssignment(db, quest.id, [{ speciesId: species.id }])
}

function seedFactionGraph(
  db: TestDb,
  campaignId: string,
  characterId: string,
  label: string
): void {
  const factionA = createFaction(db, {
    campaignId,
    key: `${label.toLowerCase()}-court`,
    name: `${label} Court`,
    kind: 'political',
    summary: 'Test court.',
    sortOrder: 0,
    source: 'campaign_create'
  })
  const factionB = createFaction(db, {
    campaignId,
    key: `${label.toLowerCase()}-guild`,
    name: `${label} Guild`,
    kind: 'mercantile',
    summary: 'Test guild.',
    sortOrder: 1,
    source: 'campaign_create'
  })
  createFactionRelation(db, {
    campaignId,
    factionAId: factionA.id,
    factionBId: factionB.id,
    stance: 'rival',
    summary: 'Harbor fees'
  })
  applyCharacterFactionReputationDelta(db, {
    characterId,
    factionId: factionA.id,
    delta: 10,
    reason: 'Seeded standing'
  })
}

function seedCampaignFootprint(db: TestDb, label: string) {
  const campaign = createCampaign(db, {
    name: label,
    premisePrompt: 'A test premise.',
    deathMode: 'legendary'
  })
  const { region, character } = seedRegionNpcAndCharacter(db, campaign.id, label)
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
  seedBestiaryAndQuest(db, campaign.id, label)
  seedFactionGraph(db, campaign.id, character.id, label)
  createSaveSnapshot(db, campaign.id)
  createWorldFact(db, { campaignId: campaign.id, content: 'Fact', regionId: region.id })
  createStoryThread(db, { campaignId: campaign.id, title: 'Thread', state: 'open' })
  appendEvent(db, { campaignId: campaign.id, type: 'player_action', payload: { test: true } })
  touchLastPlayed(db, campaign.id)
  insertTestRagChunk(db, campaign.id)
  insertTestRagBackfillState(db, campaign.id)
  insertLlmUsageEvent(db, {
    providerName: 'openai',
    modelId: 'gpt-4o-mini',
    purpose: 'play.narration',
    campaignId: campaign.id,
    outcome: 'success'
  })
  return campaign
}

const DIRECT_TABLES = [
  'regions',
  'npcs',
  'characters',
  'saves',
  'world_facts',
  'story_threads',
  'events',
  'sessions',
  'campaign_races',
  'deities',
  'bestiary_species',
  'quests',
  'llm_usage_events',
  'factions',
  'faction_relations'
] as const

const NESTED_TABLES = [
  'region_history',
  'npc_memories',
  'character_items',
  'bestiary_variants',
  'quest_foe_assignments',
  'character_faction_reputations',
  'rag_chunks',
  'rag_backfill_state'
] as const

function expectCampaignFullyDeleted(db: TestDb, campaignId: string): void {
  expect(getCampaignById(db, campaignId)).toBeUndefined()
  for (const table of DIRECT_TABLES) {
    expect(countForCampaign(db, table, campaignId)).toBe(0)
  }
  for (const table of NESTED_TABLES) {
    expect(countForCampaign(db, table, campaignId)).toBe(0)
  }
}

function expectOtherCampaignIntact(db: TestDb, otherId: string): void {
  expect(getCampaignById(db, otherId)?.name).toBe('Other')
  expect(countForCampaign(db, 'characters', otherId)).toBe(1)
  expect(countForCampaign(db, 'campaign_races', otherId)).toBe(1)
  expect(countForCampaign(db, 'deities', otherId)).toBe(1)
  expect(countForCampaign(db, 'bestiary_species', otherId)).toBe(1)
  expect(countForCampaign(db, 'bestiary_variants', otherId)).toBe(1)
  expect(countForCampaign(db, 'quest_foe_assignments', otherId)).toBe(1)
  expect(countForCampaign(db, 'factions', otherId)).toBe(2)
  expect(countForCampaign(db, 'faction_relations', otherId)).toBe(1)
  expect(countForCampaign(db, 'character_faction_reputations', otherId)).toBe(1)
  expect(
    (db.prepare('SELECT COUNT(*) as count FROM quest_foe_assignments').get() as { count: number }).count
  ).toBe(1)
  expect(
    (db.prepare('SELECT COUNT(*) as count FROM bestiary_variants').get() as { count: number }).count
  ).toBe(1)
}

describe('deleteCampaignCascade: full delete', () => {
  it('removes every campaign-scoped row across all listed tables', () => {
    const db = createTestDb()
    const target = seedCampaignFootprint(db, 'Target')
    const other = seedCampaignFootprint(db, 'Other')
    insertLlmUsageEvent(db, {
      providerName: 'openai',
      modelId: 'gpt-4o-mini',
      purpose: 'system.ping',
      campaignId: null,
      outcome: 'success'
    })
    deleteCampaignCascade(db, target.id)
    expectCampaignFullyDeleted(db, target.id)
    expectOtherCampaignIntact(db, other.id)
    expect(
      (db.prepare('SELECT COUNT(*) as count FROM llm_usage_events WHERE campaign_id IS NULL').get() as {
        count: number
      }).count
    ).toBe(1)
  })
})

describe('deleteCampaignCascade: foreign keys', () => {
  it('succeeds when foreign keys are enforced (post-migration connection state)', () => {
    const db = createTestDb()
    db.pragma('foreign_keys = ON')
    const target = seedCampaignFootprint(db, 'FkEnforced')
    expect(() => deleteCampaignCascade(db, target.id)).not.toThrow()
    expect(getCampaignById(db, target.id)).toBeUndefined()
    expect(countForCampaign(db, 'campaign_races', target.id)).toBe(0)
    expect(countForCampaign(db, 'deities', target.id)).toBe(0)
    expect(countForCampaign(db, 'bestiary_species', target.id)).toBe(0)
    expect(countForCampaign(db, 'bestiary_variants', target.id)).toBe(0)
    expect(countForCampaign(db, 'quest_foe_assignments', target.id)).toBe(0)
    expect(countForCampaign(db, 'factions', target.id)).toBe(0)
    expect(countForCampaign(db, 'faction_relations', target.id)).toBe(0)
    expect(countForCampaign(db, 'character_faction_reputations', target.id)).toBe(0)
  })
})

describe('deleteCampaignCascade: rollback', () => {
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
    expect(countForCampaign(db, 'bestiary_species', target.id)).toBe(1)
    expect(countForCampaign(db, 'bestiary_variants', target.id)).toBe(1)
    expect(countForCampaign(db, 'quest_foe_assignments', target.id)).toBe(1)
    expect(countForCampaign(db, 'factions', target.id)).toBe(2)
    expect(countForCampaign(db, 'faction_relations', target.id)).toBe(1)
    expect(countForCampaign(db, 'character_faction_reputations', target.id)).toBe(1)
  })
})
