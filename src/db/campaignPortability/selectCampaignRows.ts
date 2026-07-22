import type Database from 'better-sqlite3'

type Row = Record<string, unknown>

const DIRECT_CAMPAIGN_TABLES = [
  'regions',
  'npcs',
  'characters',
  'saves',
  'world_facts',
  'story_threads',
  'events',
  'sessions',
  'combat_encounters',
  'log_entries',
  'guided_creation_messages',
  'ask_dm_messages',
  'character_journal_entries',
  'campaign_races',
  'deities',
  'factions',
  'faction_relations',
  'bestiary_species',
  'quests'
] as const

function selectWhere(db: Database.Database, sql: string, params: unknown[]): Row[] {
  return db.prepare(sql).all(...params) as Row[]
}

function selectDirectTables(db: Database.Database, campaignId: string, out: Map<string, Row[]>): void {
  for (const table of DIRECT_CAMPAIGN_TABLES) {
    out.set(table, selectWhere(db, `SELECT * FROM ${table} WHERE campaign_id = ?`, [campaignId]))
  }
}

function selectNestedCharacterRows(
  db: Database.Database,
  campaignId: string,
  out: Map<string, Row[]>
): void {
  out.set(
    'character_items',
    selectWhere(
      db,
      `SELECT * FROM character_items WHERE character_id IN (SELECT id FROM characters WHERE campaign_id = ?)`,
      [campaignId]
    )
  )
  out.set(
    'character_item_modifications',
    selectWhere(
      db,
      `SELECT * FROM character_item_modifications WHERE character_item_id IN (
        SELECT id FROM character_items WHERE character_id IN (
          SELECT id FROM characters WHERE campaign_id = ?
        )
      )`,
      [campaignId]
    )
  )
  out.set(
    'character_quests',
    selectWhere(
      db,
      `SELECT * FROM character_quests WHERE character_id IN (SELECT id FROM characters WHERE campaign_id = ?)`,
      [campaignId]
    )
  )
  out.set(
    'character_faction_reputations',
    selectWhere(
      db,
      `SELECT * FROM character_faction_reputations
       WHERE character_id IN (SELECT id FROM characters WHERE campaign_id = ?)
          OR faction_id IN (SELECT id FROM factions WHERE campaign_id = ?)`,
      [campaignId, campaignId]
    )
  )
}

function selectNestedWorldRows(
  db: Database.Database,
  campaignId: string,
  out: Map<string, Row[]>
): void {
  out.set(
    'region_history',
    selectWhere(
      db,
      `SELECT * FROM region_history WHERE region_id IN (SELECT id FROM regions WHERE campaign_id = ?)`,
      [campaignId]
    )
  )
  out.set(
    'npc_memories',
    selectWhere(
      db,
      `SELECT * FROM npc_memories WHERE npc_id IN (SELECT id FROM npcs WHERE campaign_id = ?)`,
      [campaignId]
    )
  )
  out.set(
    'bestiary_variants',
    selectWhere(
      db,
      `SELECT * FROM bestiary_variants WHERE species_id IN (SELECT id FROM bestiary_species WHERE campaign_id = ?)`,
      [campaignId]
    )
  )
  out.set(
    'quest_foe_assignments',
    selectWhere(
      db,
      `SELECT * FROM quest_foe_assignments WHERE quest_id IN (SELECT id FROM quests WHERE campaign_id = ?)`,
      [campaignId]
    )
  )
  out.set(
    'items',
    selectWhere(
      db,
      `SELECT * FROM items WHERE id IN (
        SELECT ci.item_id FROM character_items ci
        WHERE ci.character_id IN (SELECT id FROM characters WHERE campaign_id = ?)
      )`,
      [campaignId]
    )
  )
}

export function selectCampaignRows(db: Database.Database, campaignId: string): Map<string, Row[]> {
  const out = new Map<string, Row[]>()
  out.set('campaigns', selectWhere(db, 'SELECT * FROM campaigns WHERE id = ?', [campaignId]))
  selectDirectTables(db, campaignId, out)
  selectNestedCharacterRows(db, campaignId, out)
  selectNestedWorldRows(db, campaignId, out)
  return out
}

export function selectOptionalCampaignRows(
  db: Database.Database,
  campaignId: string,
  options: { includeLlmUsage: boolean; includeRagChunks: boolean }
): Map<string, Row[]> {
  const out = new Map<string, Row[]>()
  if (options.includeLlmUsage) {
    out.set(
      'llm_usage_events',
      selectWhere(db, 'SELECT * FROM llm_usage_events WHERE campaign_id = ?', [campaignId])
    )
  }
  if (options.includeRagChunks) {
    out.set(
      'rag_chunks',
      selectWhere(db, 'SELECT * FROM rag_chunks WHERE campaign_id = ?', [campaignId])
    )
    out.set(
      'rag_backfill_state',
      selectWhere(db, 'SELECT * FROM rag_backfill_state WHERE campaign_id = ?', [campaignId])
    )
  }
  return out
}
