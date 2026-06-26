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
  }
]
