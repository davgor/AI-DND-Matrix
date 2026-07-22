import { randomUUID } from 'node:crypto'

type Row = Record<string, unknown>

/** Tables whose `id` column values must be remapped on import (not global catalogs). */
const REMAP_ID_TABLES = new Set([
  'campaigns',
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
  'bestiary_variants',
  'quests',
  'character_items',
  'character_item_modifications',
  'npc_memories',
  'region_history',
  'quest_foe_assignments',
  'rag_chunks',
  'llm_usage_events'
])

export function buildIdRemap(tableRows: Map<string, Row[]>): Map<string, string> {
  const remap = new Map<string, string>()
  for (const [table, rows] of tableRows) {
    if (!REMAP_ID_TABLES.has(table)) continue
    for (const row of rows) {
      const id = row.id
      if (typeof id === 'string' && id.length > 0 && !remap.has(id)) {
        remap.set(id, randomUUID())
      }
    }
  }
  return remap
}

export function remapRowValues(row: Row, remap: Map<string, string>): Row {
  const next: Row = {}
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === 'string' && remap.has(value)) {
      next[key] = remap.get(value)
    } else {
      next[key] = value
    }
  }
  return next
}

export function remapTableRows(
  tableRows: Map<string, Row[]>,
  remap: Map<string, string>
): Map<string, Row[]> {
  const out = new Map<string, Row[]>()
  for (const [table, rows] of tableRows) {
    if (table === 'items') {
      out.set(table, rows)
      continue
    }
    out.set(
      table,
      rows.map((row) => remapRowValues(row, remap))
    )
  }
  return out
}
