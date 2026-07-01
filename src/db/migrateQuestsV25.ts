import type Database from 'better-sqlite3'
import { backfillQuestsForCampaign } from './repositories/quests'
import { listCampaignsByLastPlayed } from './repositories/campaigns'

const QUESTS_TABLE_SQL = `
  CREATE TABLE quests (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id),
    kind TEXT NOT NULL CHECK (kind IN ('main', 'side')),
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    hook_line TEXT,
    story_thread_id TEXT REFERENCES story_threads(id),
    premise_anchor TEXT,
    region_id TEXT REFERENCES regions(id),
    source_world_fact_id TEXT REFERENCES world_facts(id),
    scale TEXT NOT NULL CHECK (scale IN ('minor', 'major')),
    objectives_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );

  CREATE UNIQUE INDEX idx_quests_source_world_fact
    ON quests(source_world_fact_id)
    WHERE source_world_fact_id IS NOT NULL;

  CREATE TABLE character_quests (
    character_id TEXT NOT NULL REFERENCES characters(id),
    quest_id TEXT NOT NULL REFERENCES quests(id),
    status TEXT NOT NULL CHECK (status IN ('available', 'active', 'completed', 'failed', 'abandoned')),
    accepted_in_game_date INTEGER,
    completed_in_game_date INTEGER,
    player_notes TEXT,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (character_id, quest_id)
  );

  CREATE INDEX idx_character_quests_character ON character_quests(character_id);
  CREATE INDEX idx_character_quests_status ON character_quests(character_id, status);
`

export function migrateQuestsV25(db: Database.Database): void {
  db.exec(QUESTS_TABLE_SQL)
  const campaigns = listCampaignsByLastPlayed(db)
  for (const campaign of campaigns) {
    backfillQuestsForCampaign(db, campaign.id)
  }
}
