import type { Migration } from './migrations'

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
  }
]
