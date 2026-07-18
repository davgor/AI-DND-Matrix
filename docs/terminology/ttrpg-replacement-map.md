# TTRPG terminology replacement map (epic 022)

Inventory of D&D-specific user-facing wording and approved neutral replacements. Use this map for future copy; do not reintroduce scrubbed terms in UI, docs, or prompts without an explicit waiver.

## Replacement map

| Old phrase | Approved replacement | Notes |
|------------|---------------------|-------|
| `AI D&D Matrix` / `AI TTRPG Matrix` | `AI-TTRPG` | App display name, window title, packaged `.exe` (079) |
| `D&D desktop app` | `TTRPG desktop app` | README / marketing copy |
| `D&D` (standalone brand reference) | `TTRPG` | User-facing prose only |
| `5E-like` | `tabletop RPG-inspired` | Rules engine description |
| `dungeon master` | `game master` | Prompts and smoke-test fixtures |
| `fantasy dungeon master` | `fantasy game master` | Prompts and smoke-test fixtures |

## Reserved identifiers (do not rename)

These strings stay unchanged to preserve npm installs, Electron identity, save compatibility, and internal module boundaries:

| Identifier | Value | Rationale |
|------------|-------|-----------|
| npm `package.json` `name` | `ai-dnd-matrix` | Private package id; lockfile and tooling paths |
| Electron `appId` | `com.davgor.aidndmatrix` | Windows / updater identity for existing installs |
| Source modules | `dm.ts`, `DmSchemaError`, `DM agent` | Internal code; "DM" is generic tabletop jargon, not a D&D trademark string |
| IPC channel names | unchanged | No D&D-specific channel names exist; renames would break preload contracts |
| SQLite schema / column ids | unchanged | No D&D-branded persisted fields |
| Archetype seed names | Fighter, Rogue, Mage, Cleric, Ranger | Generic fantasy labels; not scrubbed in this epic |

## Search inventory (pre-scrub locations)

| Area | Occurrences | Ticket |
|------|-------------|--------|
| `src/renderer` titlebar, loading screen, `index.html` | `AI D&D Matrix` | 022.2 |
| `package.json` `productName`, `description` | `AI D&D Matrix`, `D&D` | 022.7 |
| `README.md` | title, exe references, `5E-like` | 022.5 |
| `docs/runbooks/*.md` | packaged `.exe` path | 022.5 |
| `scripts/*-smoke.mjs` | `.exe` path | 022.8 |
| `scripts/claude-smoke-test.mjs`, `player2-research.mjs` | `dungeon master` in prompts | 022.4 |
| `src/main`, IPC | none found | 022.3 (no-op) |
| Board `done/` / non-moonshot backlog | none found | 022.6 (no-op) |

## Verification

- `npm run terminology:check` — fails if banned user-facing terms reappear outside waived paths.
- `src/shared/appBranding.test.ts` — display name matches `package.json` `build.productName`.
- `src/shared/compatibilityIdentifiers.test.ts` — stable `appId` and npm `name`.

## Final report (022.10)

**Scrubbed:** app display name (`AI-TTRPG`; formerly `AI TTRPG Matrix`), README/runbooks, smoke-script exe paths, research/smoke prompt copy (`game master`), `package.json` `productName` and `description`.

**Waived (intentional):**
- npm package `name` `ai-dnd-matrix` and Electron `appId` `com.davgor.aidndmatrix` — install/save identity
- Internal `dm.ts` / `DM agent` module naming — generic tabletop jargon, not user-facing brand text
- Epic 022 ticket files in `/board` — historical ticket titles describing the scrub itself
- `docs/terminology/ttrpg-replacement-map.md` — documents pre-scrub phrases for audit

**Verification:** `npm run terminology:check`, 373 tests, lint, and build all pass. No schema or IPC renames; existing SQLite saves load without migration.
