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
  }
]
