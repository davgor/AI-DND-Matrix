# EPIC: Build the SQLite persistence layer

Broken down into sub-tickets 003.1-003.14. This epic is done when all of them are.

003.1 migration runner · 003.2 campaigns · 003.3 regions · 003.4 region_history + compression query · 003.5 npcs · 003.6 characters · 003.7 saves (snapshot/restore) · 003.8 npc_memories (isolation) · 003.9 world_facts (tag retrieval) · 003.10 story_threads · 003.11 events · 003.12 sessions · 003.13 currency guard · 003.14 migration upgrade test

## Sub-tickets

### 003.1 DB migration runner infrastructure

#### Description
Build the numbered, forward-only migration runner that `/db` and the rest of the app rely on to create and evolve the SQLite schema.

#### Acceptance Criteria
- [x] A migration runner applies numbered migration files in order against a SQLite file
- [x] Running the runner twice against the same file is idempotent (already-applied migrations are skipped)
- [x] A test creates a fresh DB file, runs migrations, and confirms the expected tables exist
- [x] Opening a DB file that's missing later migrations applies only the pending ones, tested

### 003.2 campaigns table + repository

#### Description
Create the `campaigns` table (id, name, premise_prompt, created_at, current_state_summary, in_game_date, death_mode, respawn_rules) and its typed repository functions.

#### Acceptance Criteria
- [x] Migration creates the `campaigns` table with all listed columns, `respawn_rules` nullable
- [x] Repository functions: create, getById, list (ordered by last played via join/lookup), update current_state_summary
- [x] A repository function advances `in_game_date` by a given number of days and persists it
- [x] Round-trip test: create a campaign, read it back, all fields match

### 003.3 regions table + repository

#### Description
Create the `regions` table (id, campaign_id, name, description, status JSON) and its typed repository functions.

#### Acceptance Criteria
- [x] Migration creates the `regions` table with a `status` JSON column supporting at least a `destroyed`/`cause` shape
- [x] Repository functions: create, getById, listByCampaign, updateStatus
- [x] Round-trip test: create a region, mark it destroyed via updateStatus, read it back, status reflects the change

### 003.4 region_history table + repository + compression-candidate query

#### Description
Create the `region_history` table (id, region_id, in_game_date, content, is_compressed) and the query that finds compression candidates for ticket 006.9.

#### Acceptance Criteria
- [x] Migration creates `region_history` with the listed columns
- [x] Repository functions: create entry, listByRegion, markCompressed(id, newContent)
- [x] A repository function returns entries for a region older than a given in-game-day threshold and not yet compressed
- [x] Test seeds entries at various in_game_date values and confirms the threshold query returns exactly the expected subset

### 003.5 npcs table + repository

#### Description
Create the `npcs` table (id, campaign_id, region_id, name, role, disposition, status JSON, is_party_member) and its typed repository functions.

#### Acceptance Criteria
- [x] Migration creates the `npcs` table with all listed columns
- [x] Repository functions: create, getById, listByRegion, updateStatus, markPromoted (sets is_party_member true)
- [x] Round-trip test: create an NPC, mark it promoted, read it back, `is_party_member` is true

### 003.6 characters table + repository

#### Description
Create the `characters` table (id, campaign_id, name, class, stats JSON, inventory JSON, hp, xp, level, currency, kind, source_npc_id, portrait_path, sheet_background_path) and its typed repository functions.

#### Acceptance Criteria
- [x] Migration creates the `characters` table with all listed columns; `currency` defaults to 0; `source_npc_id`/image paths nullable
- [x] Repository functions: create, getById, listByCampaign, update (stats/hp/xp/level/inventory)
- [x] Round-trip test covering both `kind` values (`player`, `ai_party_member`) and a promoted character with `source_npc_id` set

### 003.7 saves table + snapshot create/restore

#### Description
Create the `saves` table (id, campaign_id, created_at, snapshot) and the repository functions used for Standard-death-mode auto-revert.

#### Acceptance Criteria
- [x] Migration creates the `saves` table
- [x] A repository function writes a full campaign+character state snapshot as a new `saves` row
- [x] A repository function restores the most recent snapshot for a campaign, overwriting current state
- [x] Round-trip test: snapshot state, mutate it (e.g. change HP), restore, confirm state matches the snapshot, not the mutation

### 003.8 npc_memories table + repository + isolation test

#### Description
Create the `npc_memories` table (id, npc_id, timestamp, content, tags JSON), append-only and queried per-NPC only.

#### Acceptance Criteria
- [x] Migration creates the `npc_memories` table
- [x] Repository functions: append memory, listByNpc (with optional recency limit)
- [x] Test proves querying NPC A's memories never returns NPC B's rows, even when both belong to the same campaign/region

### 003.9 world_facts table + repository + tag retrieval

#### Description
Create the `world_facts` table (id, campaign_id, region_id, faction_tag, content, created_at).

#### Acceptance Criteria
- [x] Migration creates the `world_facts` table with nullable `region_id`/`faction_tag`
- [x] Repository functions: create, listByRegionOrFaction(tag)
- [x] Test proves facts tagged to a region/faction are retrievable by that tag without scanning/returning unrelated facts

### 003.10 story_threads table + repository

#### Description
Create the `story_threads` table (id, campaign_id, title, state, summary).

#### Acceptance Criteria
- [x] Migration creates the `story_threads` table
- [x] Repository functions: create, listByCampaign, updateStateAndSummary
- [x] Round-trip test: create a thread, update its state/summary, read it back, changes persisted

### 003.11 events table + repository

#### Description
Create the `events` table (id, campaign_id, timestamp, type, payload JSON), the append-only log everything else derives from.

#### Acceptance Criteria
- [x] Migration creates the `events` table
- [x] Repository functions: append event, listByCampaign (with optional type filter and recency limit)
- [x] Round-trip test: append several events of different types, confirm filtered listing returns the right subset in order

### 003.12 sessions table + repository

#### Description
Create the `sessions` table (id, campaign_id, started_at, last_played_at) used by the sidebar ordering.

#### Acceptance Criteria
- [x] Migration creates the `sessions` table
- [x] Repository functions: startSession(campaignId), touchLastPlayed(campaignId)
- [x] Round-trip test: touching last_played_at updates the value and a listByLastPlayed query reflects the new order

### 003.13 characters.currency default + non-negative write guard

#### Description
Ensure the characters.currency column defaults sensibly and that the repository layer itself never silently writes a negative balance (the actual debit/credit business rule lives in the engine, ticket 004.21 - this ticket only covers the DB-level guard/default).

#### Acceptance Criteria
- [x] New characters default to `currency = 0` unless explicitly set otherwise at creation
- [x] The repository's currency-update function rejects (throws/returns an error result for) any write that would set currency below 0
- [x] Test covers both a valid update and a rejected negative-resulting update

### 003.14 Schema migration upgrade test

#### Description
Prove the forward-only migration system correctly upgrades an older save file when the app opens it.

#### Acceptance Criteria
- [x] A test creates a SQLite file at an earlier migration version (e.g. only migrations 1-2 applied)
- [x] Opening that file with the full migration set applies all pending migrations automatically
- [x] Data written under the old schema remains readable and correct after the migration runs
