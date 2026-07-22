# Campaign portability — package format (epic 132)

Portable **campaign packages** for local backup, friend-machine handoff, and in-app duplicate. Not cloud sync. No network upload in v1.

## On-disk storage this package slices

| Fact | Detail |
|------|--------|
| Model | **One shared SQLite file** for all campaigns (row isolation by `campaign_id`), not one DB file per campaign |
| Runtime path | Electron `userData/campaign.sqlite` via `src/main/db.ts` → `getDb()` (both dev and packaged) |
| Unused helper | `src/db/paths.ts` → `getDatabasePath()` documents `.data/dev.sqlite` / `userData/campaigns.sqlite` but is **not** what main opens — packages must not assume that path |
| Schema tip | SQLite pragma `user_version` via `runMigrations` / `src/db/schema.ts` (currently **49**) |
| Campaign id | UUID from `createCampaign` |

Export is a **campaign_id slice** plus on-disk image assets — never a raw copy of the whole shared DB (that would leak other campaigns and settings adjacency).

## Package format (locked)

| Setting | Value |
|---------|-------|
| File | **Single file**, extension **`.aittrpg`** |
| Container | **SQLite database** (same stack as the app; no zip dependency) |
| Magic | `portable_meta.magic = "ai-ttrpg-campaign-package"` |
| Format version | `portable_meta.format_version = 1` (independent of `user_version`) |
| App schema | Package includes the normal migrated app tables, populated only for the exported campaign |
| Package-only tables | `portable_meta` (one row), `portable_assets` (image blobs) |

Constants and IPC result unions live in `types.ts`.

### Why SQLite-not-zip

Boring and robust for this codebase: `better-sqlite3` already validates/opens files; corrupt packages fail at open; schema migrations on import reuse the existing runner; assets travel as BLOBs without a second archive format.

## Inclusion policy

### Always included (playable slice)

All tables in `PORTABLE_TABLES_ALWAYS` (aligned with epic **019** / **125** delete ownership), including nested `region_history`, `npc_memories`, `character_items`, `character_item_modifications`, `character_quests`, `character_faction_reputations`, `factions`, `faction_relations`, `bestiary_variants`, `quest_foe_assignments`.

Also include **referenced `items` rows** for that campaign’s `character_items` (global catalog table; delete does not remove them — export must copy FK targets, especially `ai_proposed` rows).

### Optional (default off)

| Option | Tables | Default |
|--------|--------|---------|
| `includeLlmUsage` | `llm_usage_events` for this `campaign_id` | **false** |
| `includeRagChunks` | `rag_chunks`, `rag_backfill_state` | **false** (rebuild on open; gameplay must not require shipping embeddings) |

### Never included

- Other campaigns’ rows
- Full global seed catalogs (`catalog_*`) — importer relies on migrations
- Settings / encrypted API keys (`settings.json`), `.env`, provider downloads
- Prompts or response bodies from usage metering

### On-disk assets (embedded as `portable_assets`)

| Kind | Source | Prefer |
|------|--------|--------|
| `portrait` | `characters.portrait_path` under `userData/portraits/` | **include** when file exists |
| `sheet_background` | `characters.sheet_background_path` | **include** when file exists |
| `npc_face_token` | `npcs.face_token_path` under `userData/npc-face-tokens/{campaignId}/` | **include** when file exists |

Missing files are skipped (logged); they do not fail export. On import, blobs are written under the local `userData` layout and DB path columns are rewritten.

## Import id policy (locked)

| Rule | Behavior |
|------|----------|
| Default | Import always creates a **new** campaign UUID (and remaps all dependent FKs / asset owner ids) |
| Replace | **Not in v1** — no silent overwrite of an existing id; no replace flow in the first UI |
| Duplicate | In-app clone uses the same remapping pipeline **without** a file picker (same as import into the live DB) |
| Conflict | New id guarantees no collision with sidebar registry |

## Validation & errors

| Condition | Result code |
|-----------|-------------|
| Campaign missing on export | `not_found` |
| Not a SQLite file / cannot open | `corrupt_package` |
| Missing/wrong `portable_meta.magic` | `invalid_package` |
| `format_version` newer than app supports | `unsupported_version` |
| `schemaUserVersion` newer than app tip | `unsupported_version` |
| Older schema in package | Open package DB, run **same** `runMigrations`, then copy rows |
| Mid-import failure | `import_failed` — transaction rollback; **no** orphan registry row / half-copied assets left registered |
| User cancels file dialog | `{ ok: false, canceled: true }` |

Corrupt / foreign files → clear typed error; never partially register a campaign.

## IPC surface (contracts for 132.2–132.4)

| Channel | Result type |
|---------|-------------|
| `campaigns:export` | `CampaignExportResult` (`path` required on success) |
| `campaigns:import` | `CampaignImportResult` (success includes new `campaignId`) |
| `campaigns:duplicate` | `CampaignDuplicateResult` (success includes new `campaignId`, no `path`) |

No generic exec/SQL channel. Secrets never appear in package bytes (assertable by scanning for known key env patterns in tests).

## UX entry (132.5)

Sidebar campaign context menu (alongside delete from **019**): **Export…**, **Duplicate**, plus hub/settings **Import campaign…**. Destructive overwrite is out of scope for v1 (no confirm needed beyond ordinary file-replace of the `.aittrpg` path the user chose).

## Out of scope (v1)

Cloud backup, partial (single-character) export, password-encrypted packages, forever cross-major compatibility beyond the migration chain.
