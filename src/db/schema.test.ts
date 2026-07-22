import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { runMigrations } from './migrations'
import { migrations } from './schema'

function tableNames(db: Database.Database): string[] {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => (row as { name: string }).name)
}

const ALL_TABLE_NAMES = [
  'ask_dm_messages',
  'bestiary_species',
  'bestiary_variants',
  'campaign_races',
  'campaigns',
  'catalog_bucket_tags',
  'catalog_creatures',
  'catalog_spells',
  'character_faction_reputations',
  'character_item_modifications',
  'character_items',
  'character_journal_entries',
  'character_quests',
  'characters',
  'combat_encounters',
  'deities',
  'events',
  'faction_relations',
  'factions',
  'guided_creation_messages',
  'items',
  'llm_usage_events',
  'log_entries',
  'npc_memories',
  'npc_opinions',
  'npcs',
  'quest_foe_assignments',
  'quests',
  'rag_backfill_state',
  'rag_chunks',
  'region_history',
  'regions',
  'saves',
  'sessions',
  'story_threads',
  'world_facts'
]

describe('the real app migrations registry', () => {
  it('applies cleanly to a fresh database and creates every expected table', () => {
    const db = new Database(':memory:')
    runMigrations(db, migrations)
    expect(tableNames(db)).toEqual(ALL_TABLE_NAMES)
  })

  it('is idempotent when run twice', () => {
    const db = new Database(':memory:')
    runMigrations(db, migrations)
    expect(() => runMigrations(db, migrations)).not.toThrow()
    expect(tableNames(db)).toEqual(ALL_TABLE_NAMES)
  })

  it('applies only pending migrations when reopened partway through the registry', () => {
    const db = new Database(':memory:')

    runMigrations(db, migrations.slice(0, 1))
    expect(tableNames(db)).toEqual(['campaigns'])

    runMigrations(db, migrations)
    expect(tableNames(db)).toEqual(ALL_TABLE_NAMES)
  })
})

describe('schema migration 35', () => {
  it('migration 35 adds deities table and pantheon_summary column', () => {
    const db = new Database(':memory:')
    runMigrations(
      db,
      migrations.filter((migration) => migration.version <= 34)
    )
    expect(tableNames(db)).not.toContain('deities')

    runMigrations(
      db,
      migrations.filter((migration) => migration.version === 35)
    )

    expect(tableNames(db)).toContain('deities')
    const campaignColumns = db
      .prepare('PRAGMA table_info(campaigns)')
      .all()
      .map((row) => (row as { name: string }).name)
    expect(campaignColumns).toContain('pantheon_summary')
  })
})

describe('schema migration 52', () => {
  it('migration 52 adds npc_opinions table', () => {
    const db = new Database(':memory:')
    runMigrations(
      db,
      migrations.filter((migration) => migration.version <= 51)
    )
    expect(tableNames(db)).not.toContain('npc_opinions')

    runMigrations(
      db,
      migrations.filter((migration) => migration.version === 52)
    )

    expect(tableNames(db)).toContain('npc_opinions')
  })
})

// EPIC-133
describe('schema migration 53', () => {
  it('migration 53 adds last_active_in_game_date on characters', () => {
    const db = new Database(':memory:')
    runMigrations(
      db,
      migrations.filter((migration) => migration.version <= 52)
    )

    const before = db
      .prepare('PRAGMA table_info(characters)')
      .all()
      .map((row) => (row as { name: string }).name)
    expect(before).not.toContain('last_active_in_game_date')

    runMigrations(
      db,
      migrations.filter((migration) => migration.version === 53)
    )

    const after = db
      .prepare('PRAGMA table_info(characters)')
      .all()
      .map((row) => (row as { name: string }).name)
    expect(after).toContain('last_active_in_game_date')
  })
})

describe('schema migration 40', () => {
  it('migration 40 adds ask_dm_messages table', () => {
    const db = new Database(':memory:')
    runMigrations(
      db,
      migrations.filter((migration) => migration.version <= 39)
    )
    expect(tableNames(db)).not.toContain('ask_dm_messages')

    runMigrations(
      db,
      migrations.filter((migration) => migration.version === 40)
    )

    expect(tableNames(db)).toContain('ask_dm_messages')
  })
})

describe('schema migration 42', () => {
  it('migration 42 adds npc_face_token_generation_enabled on campaigns', () => {
    const db = new Database(':memory:')
    runMigrations(
      db,
      migrations.filter((migration) => migration.version <= 41)
    )

    runMigrations(
      db,
      migrations.filter((migration) => migration.version === 42)
    )

    const campaignColumns = db
      .prepare('PRAGMA table_info(campaigns)')
      .all()
      .map((row) => (row as { name: string }).name)
    expect(campaignColumns).toContain('npc_face_token_generation_enabled')
  })
})

describe('schema migration 50', () => {
  it('migration 50 adds visual_appearance_json on bestiary_species', () => {
    const db = new Database(':memory:')
    runMigrations(
      db,
      migrations.filter((migration) => migration.version <= 49)
    )

    runMigrations(
      db,
      migrations.filter((migration) => migration.version === 50)
    )

    const speciesColumns = db
      .prepare('PRAGMA table_info(bestiary_species)')
      .all()
      .map((row) => (row as { name: string }).name)
    expect(speciesColumns).toContain('visual_appearance_json')
  })
})

describe('schema migration 51', () => {
  it('migration 51 adds creature_token_path on bestiary_species', () => {
    const db = new Database(':memory:')
    runMigrations(
      db,
      migrations.filter((migration) => migration.version <= 50)
    )

    runMigrations(
      db,
      migrations.filter((migration) => migration.version === 51)
    )

    const speciesColumns = db
      .prepare('PRAGMA table_info(bestiary_species)')
      .all()
      .map((row) => (row as { name: string }).name)
    expect(speciesColumns).toContain('creature_token_path')
  })
})

describe('schema migration 47', () => {
  it('migration 47 adds enemy_token_generation_enabled on campaigns', () => {
    const db = new Database(':memory:')
    runMigrations(
      db,
      migrations.filter((migration) => migration.version <= 46)
    )

    runMigrations(
      db,
      migrations.filter((migration) => migration.version === 47)
    )

    const campaignColumns = db
      .prepare('PRAGMA table_info(campaigns)')
      .all()
      .map((row) => (row as { name: string }).name)
    expect(campaignColumns).toContain('enemy_token_generation_enabled')
  })
})

describe('schema migration 54', () => {
  it('adds generative_tokens_enabled and ORs legacy NPC/enemy flags', () => {
    const db = new Database(':memory:')
    runMigrations(
      db,
      migrations.filter((migration) => migration.version <= 53)
    )
    db.prepare(
      `INSERT INTO campaigns (
         id, name, premise_prompt, created_at, death_mode, respawn_rules,
         npc_face_token_generation_enabled, enemy_token_generation_enabled
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('c-or', 'OR', 'p', '2020-01-01', 'standard', null, 1, 0)
    db.prepare(
      `INSERT INTO campaigns (
         id, name, premise_prompt, created_at, death_mode, respawn_rules,
         npc_face_token_generation_enabled, enemy_token_generation_enabled
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('c-off', 'OFF', 'p', '2020-01-01', 'standard', null, 0, 0)

    runMigrations(
      db,
      migrations.filter((migration) => migration.version === 54)
    )

    const columns = db
      .prepare('PRAGMA table_info(campaigns)')
      .all()
      .map((row) => (row as { name: string }).name)
    expect(columns).toContain('generative_tokens_enabled')

    const onRow = db
      .prepare('SELECT generative_tokens_enabled AS v FROM campaigns WHERE id = ?')
      .get('c-or') as { v: number }
    const offRow = db
      .prepare('SELECT generative_tokens_enabled AS v FROM campaigns WHERE id = ?')
      .get('c-off') as { v: number }
    expect(onRow.v).toBe(1)
    expect(offRow.v).toBe(0)
  })
})

describe('schema migration 55', () => {
  it('adds portrait_prompt on characters', () => {
    const db = new Database(':memory:')
    runMigrations(
      db,
      migrations.filter((migration) => migration.version <= 54)
    )

    runMigrations(
      db,
      migrations.filter((migration) => migration.version === 55)
    )

    const columns = db
      .prepare('PRAGMA table_info(characters)')
      .all()
      .map((row) => (row as { name: string }).name)
    expect(columns).toContain('portrait_prompt')
  })
})

describe('schema migration 46', () => {
  it('migration 46 adds face_token_path on npcs', () => {
    const db = new Database(':memory:')
    runMigrations(
      db,
      migrations.filter((migration) => migration.version <= 45)
    )

    runMigrations(
      db,
      migrations.filter((migration) => migration.version === 46)
    )

    const npcColumns = db
      .prepare('PRAGMA table_info(npcs)')
      .all()
      .map((row) => (row as { name: string }).name)
    expect(npcColumns).toContain('face_token_path')
  })
})

describe('schema migration 45', () => {
  it('migration 45 adds npc appearance trait columns', () => {
    const db = new Database(':memory:')
    runMigrations(
      db,
      migrations.filter((migration) => migration.version <= 44)
    )

    runMigrations(
      db,
      migrations.filter((migration) => migration.version === 45)
    )

    const npcColumns = db
      .prepare('PRAGMA table_info(npcs)')
      .all()
      .map((row) => (row as { name: string }).name)
    expect(npcColumns).toContain('hair_color')
    expect(npcColumns).toContain('age')
    expect(npcColumns).toContain('eye_color')
  })
})

describe('schema migration 43', () => {
  it('migration 43 adds campaign session recap columns', () => {
    const db = new Database(':memory:')
    runMigrations(
      db,
      migrations.filter((migration) => migration.version <= 42)
    )

    runMigrations(
      db,
      migrations.filter((migration) => migration.version === 43)
    )

    const campaignColumns = db
      .prepare('PRAGMA table_info(campaigns)')
      .all()
      .map((row) => (row as { name: string }).name)
    expect(campaignColumns).toContain('session_recap_text')
    expect(campaignColumns).toContain('session_recap_generated_at')
  })
})

describe('schema migration 44', () => {
  it('migration 44 allows companions guided-creation phase on characters', () => {
    const db = new Database(':memory:')
    runMigrations(
      db,
      migrations.filter((migration) => migration.version <= 43)
    )

    runMigrations(
      db,
      migrations.filter((migration) => migration.version === 44)
    )

    const row = db
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'characters'")
      .get() as { sql: string }
    expect(row.sql).toContain("'companions'")
  })
})

describe('schema migration 17', () => {
  it('migration 17 adds alignment and temperament columns', () => {
    const db = new Database(':memory:')
    runMigrations(
      db,
      migrations.filter((migration) => migration.version <= 16)
    )

    runMigrations(
      db,
      migrations.filter((migration) => migration.version === 17)
    )

    const characterColumns = db
      .prepare("PRAGMA table_info(characters)")
      .all()
      .map((row) => (row as { name: string }).name)
    expect(characterColumns).toContain('alignment')
    expect(characterColumns).toContain('pending_alignment_shift')

    const npcColumns = db
      .prepare("PRAGMA table_info(npcs)")
      .all()
      .map((row) => (row as { name: string }).name)
    expect(npcColumns).toContain('alignment')
    expect(npcColumns).toContain('temperament')
    expect(npcColumns).toContain('can_speak')

    const creatureColumns = db
      .prepare("PRAGMA table_info(catalog_creatures)")
      .all()
      .map((row) => (row as { name: string }).name)
    expect(creatureColumns).toContain('temperament')
    expect(creatureColumns).toContain('can_speak')
  })
})
