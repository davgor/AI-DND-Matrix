import type Database from 'better-sqlite3'
import type { Migration } from './migrations'
import { seedCreatureAndSpellCatalogV1 } from './catalog/seeds'
import { migrateLegacyCharacterInventory } from './migrateLegacyInventory'
import { migrateHpBackfill } from './migrateHpBackfill'
import { migrateEquipSlotsV24 } from './migrateEquipSlotsV24'
import { migrateQuestsV25 } from './migrateQuestsV25'
import { migrateGuidedCreationEquipmentPhaseV26 } from './migrateGuidedCreationEquipmentPhaseV26'
import { migrateRaceSelectionCharactersV29 } from './migrateRaceSelectionCharactersV29'
import { migrateCharacterBackgroundCharactersV31 } from './migrateCharacterBackgroundCharactersV31'
import { seedStarterItemCatalog } from './seedStarterItems'

function addColumnIfMissing(
  db: Database.Database,
  table: string,
  column: string,
  definition: string
): void {
  const columns = db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map((row) => (row as { name: string }).name)
  if (!columns.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

const CATALOG_TABLES_SQL = `
  CREATE TABLE catalog_creatures (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    archetype_hint TEXT,
    level_min INTEGER NOT NULL,
    level_max INTEGER NOT NULL,
    hp INTEGER NOT NULL,
    ac INTEGER NOT NULL,
    abilities TEXT NOT NULL DEFAULT '{}',
    resistances TEXT NOT NULL DEFAULT '{}',
    damage_types TEXT NOT NULL DEFAULT '[]',
    tags TEXT NOT NULL DEFAULT '[]',
    temperament TEXT NOT NULL DEFAULT 'neutral',
    can_speak INTEGER NOT NULL DEFAULT 1,
    source TEXT NOT NULL DEFAULT 'seed',
    provenance TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE catalog_spells (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    effect_type TEXT NOT NULL,
    range TEXT NOT NULL,
    cost INTEGER NOT NULL,
    archetype_hint TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    constraints TEXT NOT NULL DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'seed',
    provenance TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE catalog_bucket_tags (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('creature', 'spell')),
    entity_id TEXT NOT NULL,
    bucket TEXT NOT NULL
  );

  CREATE INDEX idx_catalog_bucket_tags_bucket ON catalog_bucket_tags(bucket);
  CREATE INDEX idx_catalog_bucket_tags_entity ON catalog_bucket_tags(entity_type, entity_id);
  CREATE INDEX idx_catalog_creatures_level ON catalog_creatures(level_min, level_max);
  CREATE INDEX idx_catalog_creatures_archetype ON catalog_creatures(archetype_hint);
  CREATE INDEX idx_catalog_spells_archetype ON catalog_spells(archetype_hint);
`

export const migrations: Migration[] = [
  {
    version: 1,
    up: (db) => {
      db.exec(`
        CREATE TABLE campaigns (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          premise_prompt TEXT NOT NULL,
          created_at TEXT NOT NULL,
          current_state_summary TEXT NOT NULL DEFAULT '',
          in_game_date INTEGER NOT NULL DEFAULT 0,
          death_mode TEXT NOT NULL CHECK (death_mode IN ('legendary', 'standard', 'respawn')),
          respawn_rules TEXT
        )
      `)
    }
  },
  {
    version: 2,
    up: (db) => {
      db.exec(`
        CREATE TABLE regions (
          id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL REFERENCES campaigns(id),
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT '{}'
        )
      `)
    }
  },
  {
    version: 3,
    up: (db) => {
      db.exec(`
        CREATE TABLE region_history (
          id TEXT PRIMARY KEY,
          region_id TEXT NOT NULL REFERENCES regions(id),
          in_game_date INTEGER NOT NULL,
          content TEXT NOT NULL,
          is_compressed INTEGER NOT NULL DEFAULT 0
        )
      `)
    }
  },
  {
    version: 4,
    up: (db) => {
      db.exec(`
        CREATE TABLE npcs (
          id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL REFERENCES campaigns(id),
          region_id TEXT NOT NULL REFERENCES regions(id),
          name TEXT NOT NULL,
          role TEXT NOT NULL,
          disposition TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT '{}',
          is_party_member INTEGER NOT NULL DEFAULT 0
        )
      `)
    }
  },
  {
    version: 5,
    up: (db) => {
      db.exec(`
        CREATE TABLE characters (
          id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL REFERENCES campaigns(id),
          name TEXT NOT NULL,
          class TEXT NOT NULL,
          stats TEXT NOT NULL DEFAULT '{}',
          inventory TEXT NOT NULL DEFAULT '[]',
          hp INTEGER NOT NULL DEFAULT 0,
          xp INTEGER NOT NULL DEFAULT 0,
          level INTEGER NOT NULL DEFAULT 1,
          currency INTEGER NOT NULL DEFAULT 0,
          kind TEXT NOT NULL CHECK (kind IN ('player', 'ai_party_member')),
          source_npc_id TEXT REFERENCES npcs(id),
          portrait_path TEXT,
          sheet_background_path TEXT
        )
      `)
    }
  },
  {
    version: 6,
    up: (db) => {
      db.exec(`
        CREATE TABLE saves (
          id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL REFERENCES campaigns(id),
          created_at TEXT NOT NULL,
          snapshot TEXT NOT NULL
        )
      `)
    }
  },
  {
    version: 7,
    up: (db) => {
      db.exec(`
        CREATE TABLE npc_memories (
          id TEXT PRIMARY KEY,
          npc_id TEXT NOT NULL REFERENCES npcs(id),
          timestamp TEXT NOT NULL,
          content TEXT NOT NULL,
          tags TEXT NOT NULL DEFAULT '[]'
        )
      `)
    }
  },
  {
    version: 8,
    up: (db) => {
      db.exec(`
        CREATE TABLE world_facts (
          id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL REFERENCES campaigns(id),
          region_id TEXT REFERENCES regions(id),
          faction_tag TEXT,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `)
    }
  },
  {
    version: 9,
    up: (db) => {
      db.exec(`
        CREATE TABLE story_threads (
          id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL REFERENCES campaigns(id),
          title TEXT NOT NULL,
          state TEXT NOT NULL,
          summary TEXT NOT NULL DEFAULT ''
        )
      `)
    }
  },
  {
    version: 10,
    up: (db) => {
      db.exec(`
        CREATE TABLE events (
          id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL REFERENCES campaigns(id),
          timestamp TEXT NOT NULL,
          type TEXT NOT NULL,
          payload TEXT NOT NULL DEFAULT '{}'
        )
      `)
    }
  },
  {
    version: 11,
    up: (db) => {
      db.exec(`
        CREATE TABLE sessions (
          id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL UNIQUE REFERENCES campaigns(id),
          started_at TEXT NOT NULL,
          last_played_at TEXT NOT NULL
        )
      `)
    }
  },
  {
    version: 12,
    up: (db) => {
      db.exec(CATALOG_TABLES_SQL)
      seedCreatureAndSpellCatalogV1(db)
    }
  },
  {
    version: 13,
    up: (db) => {
      db.exec(`
        CREATE TABLE items (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL COLLATE NOCASE UNIQUE,
          item_type TEXT NOT NULL CHECK (item_type IN ('weapon', 'armor', 'potion', 'magicItem', 'misc')),
          description TEXT NOT NULL DEFAULT '',
          rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic')),
          mechanical_properties TEXT NOT NULL DEFAULT '{}',
          equip_slot TEXT CHECK (equip_slot IN (
            'armor', 'mainHand', 'offHand',
            'head', 'hands', 'feet', 'belt', 'neck', 'ring1', 'ring2'
          ) OR equip_slot IS NULL),
          source TEXT NOT NULL DEFAULT 'seed' CHECK (source IN ('seed', 'ai_proposed', 'migrated'))
        );

        CREATE TABLE character_items (
          id TEXT PRIMARY KEY,
          character_id TEXT NOT NULL REFERENCES characters(id),
          item_id TEXT NOT NULL REFERENCES items(id),
          quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
          equipped_slot TEXT CHECK (equipped_slot IN (
            'armor', 'mainHand', 'offHand',
            'head', 'hands', 'feet', 'belt', 'neck', 'ring1', 'ring2'
          ) OR equipped_slot IS NULL),
          UNIQUE (character_id, item_id)
        );
      `)
      migrateLegacyCharacterInventory(db)
      seedStarterItemCatalog(db)
    }
  },
  {
    version: 14,
    up: (db) => {
      db.exec(`
        CREATE TABLE log_entries (
          id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL REFERENCES campaigns(id),
          character_id TEXT NOT NULL REFERENCES characters(id),
          category TEXT NOT NULL CHECK (category IN ('event', 'place', 'person', 'beast', 'thing')),
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          related_entity_id TEXT,
          learned_in_game_date INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );

        CREATE INDEX idx_log_entries_character ON log_entries(character_id);
        CREATE INDEX idx_log_entries_character_category ON log_entries(character_id, category);
      `)
    }
  },
  {
    version: 15,
    up: (db) => {
      db.exec(`
        ALTER TABLE characters ADD COLUMN identity_who TEXT;
        ALTER TABLE characters ADD COLUMN identity_why TEXT;
        ALTER TABLE characters ADD COLUMN identity_where TEXT;
        ALTER TABLE characters ADD COLUMN identity_what TEXT;
        ALTER TABLE characters ADD COLUMN opening_scene TEXT;
        ALTER TABLE characters ADD COLUMN guided_creation_phase TEXT NOT NULL DEFAULT 'none'
          CHECK (guided_creation_phase IN ('none', 'identity', 'opening_scene', 'complete'));

        CREATE TABLE guided_creation_messages (
          id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL REFERENCES campaigns(id),
          character_id TEXT NOT NULL REFERENCES characters(id),
          phase TEXT NOT NULL CHECK (phase IN ('identity', 'opening_scene')),
          role TEXT NOT NULL CHECK (role IN ('player', 'dm')),
          content TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE INDEX idx_guided_creation_messages_character ON guided_creation_messages(character_id);
      `)
      db.prepare(
        `UPDATE characters SET guided_creation_phase = 'complete' WHERE kind = 'player'`
      ).run()
    }
  },
  {
    version: 16,
    up: (db) => {
      db.exec(`
        CREATE TABLE character_journal_entries (
          id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL REFERENCES campaigns(id),
          character_id TEXT NOT NULL REFERENCES characters(id),
          content TEXT NOT NULL,
          in_game_date INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );

        CREATE INDEX idx_character_journal_entries_character ON character_journal_entries(character_id);
      `)
    }
  },
  {
    version: 17,
    up: (db) => {
      addColumnIfMissing(db, 'characters', 'alignment', 'TEXT')
      addColumnIfMissing(db, 'characters', 'pending_alignment_shift', 'TEXT')

      addColumnIfMissing(db, 'npcs', 'alignment', 'TEXT')
      addColumnIfMissing(db, 'npcs', 'temperament', "TEXT NOT NULL DEFAULT 'neutral'")
      addColumnIfMissing(db, 'npcs', 'can_speak', 'INTEGER NOT NULL DEFAULT 1')

      addColumnIfMissing(db, 'catalog_creatures', 'temperament', "TEXT NOT NULL DEFAULT 'neutral'")
      addColumnIfMissing(db, 'catalog_creatures', 'can_speak', 'INTEGER NOT NULL DEFAULT 1')
    }
  },
  {
    version: 18,
    up: (db) => {
      addColumnIfMissing(db, 'npcs', 'hp', 'INTEGER')
      addColumnIfMissing(db, 'npcs', 'max_hp', 'INTEGER')
      addColumnIfMissing(db, 'npcs', 'ac', 'INTEGER')
      addColumnIfMissing(db, 'npcs', 'conditions', "TEXT NOT NULL DEFAULT '[]'")
      addColumnIfMissing(db, 'npcs', 'catalog_creature_key', 'TEXT')
      addColumnIfMissing(db, 'npcs', 'encounter_outcome', 'TEXT')

      db.exec(`
        CREATE TABLE combat_encounters (
          id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL REFERENCES campaigns(id),
          phase TEXT NOT NULL CHECK (phase IN ('active', 'resolved')),
          outcome TEXT,
          initiative_order TEXT NOT NULL DEFAULT '[]',
          active_turn_index INTEGER NOT NULL DEFAULT 0,
          round INTEGER NOT NULL DEFAULT 1,
          participant_ids TEXT NOT NULL DEFAULT '[]',
          started_at TEXT NOT NULL,
          ended_at TEXT
        );

        CREATE UNIQUE INDEX idx_combat_encounters_active_campaign
          ON combat_encounters(campaign_id)
          WHERE phase = 'active';
      `)
    }
  },
  {
    version: 19,
    up: (db) => {
      addColumnIfMissing(db, 'npcs', 'backstory', "TEXT NOT NULL DEFAULT ''")
      addColumnIfMissing(db, 'npcs', 'combat_tier', "TEXT NOT NULL DEFAULT 'villager'")
      addColumnIfMissing(db, 'npcs', 'retired_adventurer_profile', 'TEXT')
      addColumnIfMissing(db, 'npcs', 'attack_bonus', 'INTEGER')
      addColumnIfMissing(db, 'npcs', 'damage_roll', 'TEXT')

      const villagerDamageRoll = JSON.stringify({ diceCount: 1, diceSize: 4, modifier: 0 })
      db.prepare(
        `UPDATE npcs SET
          hp = COALESCE(hp, ?),
          max_hp = COALESCE(max_hp, ?),
          ac = COALESCE(ac, ?),
          attack_bonus = COALESCE(attack_bonus, ?),
          damage_roll = COALESCE(damage_roll, ?),
          combat_tier = COALESCE(NULLIF(combat_tier, ''), 'villager')
        WHERE catalog_creature_key IS NULL`
      ).run(6, 6, 10, 0, villagerDamageRoll)
    }
  },
  {
    version: 20,
    up: (db) => {
      addColumnIfMissing(db, 'combat_encounters', 'pursuit_state', "TEXT NOT NULL DEFAULT 'engaged'")
      addColumnIfMissing(db, 'combat_encounters', 'exited_combatant_ids', "TEXT NOT NULL DEFAULT '[]'")
    }
  },
  {
    version: 21,
    up: (db) => {
      db.exec(`
        CREATE TABLE character_item_modifications (
          id TEXT PRIMARY KEY,
          character_item_id TEXT NOT NULL REFERENCES character_items(id) ON DELETE CASCADE,
          kind TEXT NOT NULL CHECK (kind IN ('addDamageComponent', 'setDescription', 'setDisplayName')),
          payload TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE INDEX idx_character_item_modifications_item
          ON character_item_modifications(character_item_id);
      `)
    }
  },
  {
    version: 22,
    up: (db) => {
      addColumnIfMissing(db, 'characters', 'life_status', "TEXT NOT NULL DEFAULT 'alive'")
      addColumnIfMissing(db, 'characters', 'died_at', 'TEXT')
      addColumnIfMissing(db, 'characters', 'death_cause', 'TEXT')
      addColumnIfMissing(db, 'characters', 'obituary_json', 'TEXT')
      addColumnIfMissing(db, 'characters', 'owner_player_character_id', 'TEXT')
    }
  },
  {
    version: 23,
    up: (db) => {
      migrateHpBackfill(db)
    }
  },
  {
    version: 24,
    up: (db) => {
      migrateEquipSlotsV24(db)
    }
  },
  {
    version: 25,
    up: (db) => {
      migrateQuestsV25(db)
    }
  },
  {
    version: 26,
    disableTransaction: true,
    up: (db) => {
      migrateGuidedCreationEquipmentPhaseV26(db)
    }
  },
  {
    version: 27,
    up: (db) => {
      seedStarterItemCatalog(db)
      seedCreatureAndSpellCatalogV1(db)
    }
  },
  {
    version: 28,
    up: (db) => {
      seedCreatureAndSpellCatalogV1(db)
    }
  },
  {
    version: 29,
    disableTransaction: true,
    up: (db) => {
      migrateRaceSelectionCharactersV29(db)
    }
  },
  {
    version: 30,
    up: (db) => {
      db.exec(`
        CREATE TABLE campaign_races (
          id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL REFERENCES campaigns(id),
          race_key TEXT NOT NULL,
          kind TEXT NOT NULL CHECK (kind IN ('preset', 'custom')),
          label TEXT NOT NULL,
          seed_prompt TEXT NOT NULL,
          lore TEXT NOT NULL,
          created_by_character_id TEXT REFERENCES characters(id),
          created_at TEXT NOT NULL,
          UNIQUE(campaign_id, race_key)
        );

        CREATE INDEX idx_campaign_races_campaign ON campaign_races(campaign_id);
      `)
      addColumnIfMissing(db, 'npcs', 'race_key', 'TEXT')
    }
  },
  {
    version: 31,
    disableTransaction: true,
    up: (db) => {
      migrateCharacterBackgroundCharactersV31(db)
    }
  },
  {
    version: 32,
    up: (db) => {
      addColumnIfMissing(db, 'npcs', 'background_key', 'TEXT')
    }
  },
  {
    version: 33,
    up: (db) => {
      addColumnIfMissing(db, 'npcs', 'gender_key', 'TEXT')
      addColumnIfMissing(db, 'npcs', 'class_key', 'TEXT')
    }
  },
  {
    version: 34,
    up: (db) => {
      addColumnIfMissing(db, 'campaigns', 'world_name', "TEXT NOT NULL DEFAULT ''")
      addColumnIfMissing(db, 'campaigns', 'world_summary', "TEXT NOT NULL DEFAULT ''")
      addColumnIfMissing(db, 'campaigns', 'world_history', "TEXT NOT NULL DEFAULT ''")
    }
  },
  {
    version: 35,
    up: (db) => {
      addColumnIfMissing(db, 'campaigns', 'pantheon_summary', "TEXT NOT NULL DEFAULT ''")
      db.exec(`
        CREATE TABLE IF NOT EXISTS deities (
          id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL,
          name TEXT NOT NULL,
          epithet TEXT NOT NULL,
          domains TEXT NOT NULL,
          tenets TEXT NOT NULL,
          blurb TEXT NOT NULL,
          is_forgotten INTEGER NOT NULL DEFAULT 0,
          sort_order INTEGER NOT NULL,
          FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
        )
      `)
    }
  }
]
