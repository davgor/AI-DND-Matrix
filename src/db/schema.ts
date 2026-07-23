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
import { migrateCompanionsGuidedPhaseV44 } from './migrateCompanionsGuidedPhaseV44'
import { seedStarterItemCatalog } from './seedStarterItems'
import { migrateRagChunksV37 } from './rag/migrateRagChunksV37'
import { migrateRagEmbedderMetaV57 } from './rag/migrateRagEmbedderMetaV57'

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

const FACTIONS_V48_FACTIONS_SQL = `
    CREATE TABLE IF NOT EXISTS factions (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      key TEXT NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      summary TEXT NOT NULL,
      motivation TEXT,
      public_face TEXT,
      methods TEXT,
      deity_id TEXT,
      home_region_id TEXT,
      sort_order INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      source TEXT NOT NULL,
      UNIQUE(campaign_id, key),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
      FOREIGN KEY (deity_id) REFERENCES deities(id),
      FOREIGN KEY (home_region_id) REFERENCES regions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_factions_campaign
      ON factions(campaign_id);
  `

const FACTIONS_V48_RELATIONS_SQL = `
    CREATE TABLE IF NOT EXISTS faction_relations (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      faction_a_id TEXT NOT NULL,
      faction_b_id TEXT NOT NULL,
      stance TEXT NOT NULL,
      summary TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE(campaign_id, faction_a_id, faction_b_id),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
      FOREIGN KEY (faction_a_id) REFERENCES factions(id),
      FOREIGN KEY (faction_b_id) REFERENCES factions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_faction_relations_campaign
      ON faction_relations(campaign_id);

    CREATE TABLE IF NOT EXISTS character_faction_reputations (
      character_id TEXT NOT NULL,
      faction_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      band TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_reason TEXT,
      PRIMARY KEY (character_id, faction_id),
      FOREIGN KEY (character_id) REFERENCES characters(id),
      FOREIGN KEY (faction_id) REFERENCES factions(id)
    );
  `

function createFactionTablesV48(db: Database.Database): void {
  db.exec(FACTIONS_V48_FACTIONS_SQL)
  db.exec(FACTIONS_V48_RELATIONS_SQL)
}

function migrateFactionsV48(db: Database.Database): void {
  addColumnIfMissing(db, 'campaigns', 'factions_summary', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(db, 'campaigns', 'faction_pressure', "TEXT NOT NULL DEFAULT 'light'")
  createFactionTablesV48(db)
  addColumnIfMissing(db, 'npcs', 'faction_id', 'TEXT')
  addColumnIfMissing(db, 'npcs', 'faction_membership_role', 'TEXT')
  addColumnIfMissing(db, 'npcs', 'deity_id', 'TEXT')
  addColumnIfMissing(db, 'npcs', 'is_divine_manifestation', 'INTEGER NOT NULL DEFAULT 0')
}

function createNpcOpinionsTableV52(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS npc_opinions (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id),
      npc_id TEXT NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
      subject_type TEXT NOT NULL CHECK (subject_type IN ('player_character', 'npc')),
      subject_id TEXT NOT NULL,
      summary TEXT,
      generated_at TEXT,
      last_relevant_interaction_at TEXT,
      stance TEXT NOT NULL DEFAULT 'unknown'
        CHECK (stance IN ('warm', 'wary', 'hostile', 'unknown')),
      UNIQUE(npc_id, subject_type, subject_id)
    );

    CREATE INDEX IF NOT EXISTS idx_npc_opinions_campaign
      ON npc_opinions(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_npc_opinions_npc
      ON npc_opinions(npc_id);
  `)
}

function migrateLegacyOpinionsIntoTableV52(db: Database.Database): void {
  const legacyRows = db
    .prepare(
      `SELECT id, campaign_id, opinion_summary, opinion_summary_generated_at, last_player_interaction_at
       FROM npcs WHERE opinion_summary IS NOT NULL`
    )
    .all() as Array<{
    id: string
    campaign_id: string
    opinion_summary: string
    opinion_summary_generated_at: string | null
    last_player_interaction_at: string | null
  }>

  const insert = db.prepare(
    `INSERT OR IGNORE INTO npc_opinions (
       id, campaign_id, npc_id, subject_type, subject_id,
       summary, generated_at, last_relevant_interaction_at, stance
     ) VALUES (?, ?, ?, 'player_character', ?, ?, ?, ?, 'unknown')`
  )
  const findHero = db.prepare(
    `SELECT id FROM characters
     WHERE campaign_id = ? AND kind = 'player'
     ORDER BY rowid ASC LIMIT 1`
  )

  for (const row of legacyRows) {
    const hero = findHero.get(row.campaign_id) as { id: string } | undefined
    if (!hero) {
      continue
    }
    insert.run(
      `legacy-${row.id}`,
      row.campaign_id,
      row.id,
      hero.id,
      row.opinion_summary,
      row.opinion_summary_generated_at,
      row.last_player_interaction_at
    )
  }
}

function migrateNpcOpinionsV52(db: Database.Database): void {
  createNpcOpinionsTableV52(db)
  migrateLegacyOpinionsIntoTableV52(db)
}

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
  },
  {
    version: 36,
    up: (db) => {
      addColumnIfMissing(db, 'npcs', 'speaking_style_specimen', 'TEXT')
      addColumnIfMissing(db, 'npcs', 'speaking_style_examples_json', 'TEXT')
    }
  },
  {
    version: 37,
    up: (db) => {
      migrateRagChunksV37(db)
    }
  },
  {
    version: 38,
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS bestiary_species (
          id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL,
          species_key TEXT NOT NULL,
          name TEXT NOT NULL,
          base_lore TEXT NOT NULL,
          buckets_json TEXT NOT NULL,
          tags_json TEXT NOT NULL,
          default_catalog_key TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(campaign_id, species_key),
          FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
        );

        CREATE INDEX IF NOT EXISTS idx_bestiary_species_campaign
          ON bestiary_species(campaign_id);

        CREATE TABLE IF NOT EXISTS bestiary_variants (
          id TEXT PRIMARY KEY,
          species_id TEXT NOT NULL,
          variant_key TEXT NOT NULL,
          catalog_key_override TEXT,
          modifier_profile_id TEXT,
          flavor_blurb TEXT,
          UNIQUE(species_id, variant_key),
          FOREIGN KEY (species_id) REFERENCES bestiary_species(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_bestiary_variants_species
          ON bestiary_variants(species_id);

        CREATE TABLE IF NOT EXISTS quest_foe_assignments (
          id TEXT PRIMARY KEY,
          quest_id TEXT NOT NULL,
          species_id TEXT NOT NULL,
          planned_composition_json TEXT,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          FOREIGN KEY (quest_id) REFERENCES quests(id),
          FOREIGN KEY (species_id) REFERENCES bestiary_species(id)
        );

        CREATE INDEX IF NOT EXISTS idx_quest_foe_assignments_quest
          ON quest_foe_assignments(quest_id);
      `)
      addColumnIfMissing(db, 'npcs', 'bestiary_species_id', 'TEXT')
      addColumnIfMissing(db, 'npcs', 'bestiary_variant_key', 'TEXT')
    }
  },
  {
    version: 39,
    up: (db) => {
      addColumnIfMissing(db, 'npcs', 'opinion_summary', 'TEXT')
      addColumnIfMissing(db, 'npcs', 'opinion_summary_generated_at', 'TEXT')
      addColumnIfMissing(db, 'npcs', 'last_player_interaction_at', 'TEXT')
    }
  },
  {
    version: 40,
    up: (db) => {
      db.exec(`
        CREATE TABLE ask_dm_messages (
          id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL REFERENCES campaigns(id),
          character_id TEXT NOT NULL REFERENCES characters(id),
          role TEXT NOT NULL CHECK (role IN ('player', 'dm')),
          content TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE INDEX idx_ask_dm_messages_character ON ask_dm_messages(character_id);
      `)
    }
  },
  {
    version: 41,
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS llm_usage_events (
          id TEXT PRIMARY KEY,
          provider_name TEXT NOT NULL,
          model_id TEXT NOT NULL,
          input_tokens INTEGER,
          output_tokens INTEGER,
          total_tokens INTEGER,
          purpose TEXT NOT NULL,
          bucket TEXT NOT NULL,
          campaign_id TEXT,
          character_id TEXT,
          created_at TEXT NOT NULL,
          outcome TEXT NOT NULL,
          error_message TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_llm_usage_events_purpose
          ON llm_usage_events(purpose);
        CREATE INDEX IF NOT EXISTS idx_llm_usage_events_bucket
          ON llm_usage_events(bucket);
        CREATE INDEX IF NOT EXISTS idx_llm_usage_events_campaign_id
          ON llm_usage_events(campaign_id);
        CREATE INDEX IF NOT EXISTS idx_llm_usage_events_created_at
          ON llm_usage_events(created_at);
      `)
    }
  },
  {
    version: 42,
    up: (db) => {
      addColumnIfMissing(
        db,
        'campaigns',
        'npc_face_token_generation_enabled',
        'INTEGER NOT NULL DEFAULT 0'
      )
    }
  },
  {
    version: 43,
    up: (db) => {
      addColumnIfMissing(db, 'campaigns', 'session_recap_text', 'TEXT')
      addColumnIfMissing(db, 'campaigns', 'session_recap_generated_at', 'TEXT')
    }
  },
  {
    version: 44,
    disableTransaction: true,
    up: (db) => {
      migrateCompanionsGuidedPhaseV44(db)
    }
  },
  {
    version: 45,
    up: (db) => {
      addColumnIfMissing(db, 'npcs', 'hair_color', 'TEXT')
      addColumnIfMissing(db, 'npcs', 'age', 'TEXT')
      addColumnIfMissing(db, 'npcs', 'eye_color', 'TEXT')
    }
  },
  {
    version: 46,
    up: (db) => {
      addColumnIfMissing(db, 'npcs', 'face_token_path', 'TEXT')
    }
  },
  {
    version: 47,
    up: (db) => {
      addColumnIfMissing(
        db,
        'campaigns',
        'enemy_token_generation_enabled',
        'INTEGER NOT NULL DEFAULT 0'
      )
    }
  },
  {
    version: 48,
    up: migrateFactionsV48
  },
  {
    version: 49,
    up: (db) => {
      addColumnIfMissing(db, 'characters', 'background_custom_label', 'TEXT')
    }
  },
  {
    version: 50,
    up: (db) => {
      addColumnIfMissing(db, 'bestiary_species', 'visual_appearance_json', 'TEXT')
    }
  },
  {
    version: 51,
    up: (db) => {
      addColumnIfMissing(db, 'bestiary_species', 'creature_token_path', 'TEXT')
    }
  },
  {
    version: 52,
    up: (db) => {
      migrateNpcOpinionsV52(db)
    }
  },
  // EPIC-133 — per-PC last-active world-day watermark (Model B)
  {
    version: 53,
    up: (db) => {
      addColumnIfMissing(db, 'characters', 'last_active_in_game_date', 'INTEGER NOT NULL DEFAULT 0')
    }
  },
  // EPIC-144 — unify NPC + enemy generative-token toggles
  {
    version: 54,
    up: (db) => {
      addColumnIfMissing(
        db,
        'campaigns',
        'generative_tokens_enabled',
        'INTEGER NOT NULL DEFAULT 0'
      )
      db.prepare(
        `UPDATE campaigns
         SET generative_tokens_enabled = 1
         WHERE npc_face_token_generation_enabled = 1
            OR enemy_token_generation_enabled = 1`
      ).run()
    }
  },
  // EPIC-144 — last player-icon generation prompt for regenerate prefills
  {
    version: 55,
    up: (db) => {
      addColumnIfMissing(db, 'characters', 'portrait_prompt', 'TEXT')
    }
  },
  // Ticket 155 — expand creature seed catalog from 16 → 48 conventional foes
  {
    version: 56,
    up: (db) => {
      seedCreatureAndSpellCatalogV1(db)
    }
  },
  // Epic 154 — RAG embedder identity on chunks (lexical → neural/cloud re-embed)
  {
    version: 57,
    up: (db) => {
      migrateRagEmbedderMetaV57(db)
    }
  }
]
