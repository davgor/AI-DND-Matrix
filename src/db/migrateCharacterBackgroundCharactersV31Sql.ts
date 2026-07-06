const GUIDED_PHASE_CHECK =
  "guided_creation_phase IN ('none', 'race', 'background', 'equipment', 'identity', 'opening_scene', 'complete')"

export const CHARACTERS_V31_DDL = `
  CREATE TABLE characters_v31 (
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
    sheet_background_path TEXT,
    identity_who TEXT,
    identity_why TEXT,
    identity_where TEXT,
    identity_what TEXT,
    opening_scene TEXT,
    guided_creation_phase TEXT NOT NULL DEFAULT 'none'
      CHECK (${GUIDED_PHASE_CHECK}),
    alignment TEXT,
    pending_alignment_shift TEXT,
    life_status TEXT NOT NULL DEFAULT 'alive',
    died_at TEXT,
    death_cause TEXT,
    obituary_json TEXT,
    owner_player_character_id TEXT,
    race_key TEXT,
    background_key TEXT,
    background_story TEXT
  );
`

export const COPY_CHARACTERS_TO_V31_SQL = `
  INSERT INTO characters_v31 (
    id, campaign_id, name, class, stats, inventory, hp, xp, level, currency,
    kind, source_npc_id, portrait_path, sheet_background_path,
    identity_who, identity_why, identity_where, identity_what, opening_scene,
    guided_creation_phase, alignment, pending_alignment_shift,
    life_status, died_at, death_cause, obituary_json, owner_player_character_id,
    race_key, background_key, background_story
  )
  SELECT
    id, campaign_id, name, class, stats, inventory, hp, xp, level, currency,
    kind, source_npc_id, portrait_path, sheet_background_path,
    identity_who, identity_why, identity_where, identity_what, opening_scene,
    guided_creation_phase, alignment, pending_alignment_shift,
    COALESCE(life_status, 'alive'), died_at, death_cause, obituary_json, owner_player_character_id,
    race_key, NULL, NULL
  FROM characters;
`
