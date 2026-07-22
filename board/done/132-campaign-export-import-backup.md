# EPIC: Campaign export, import, and backup

The app is distributed as a packaged desktop build “shared with friends,” but campaign saves live as opaque SQLite under Electron `userData`. Players can delete campaigns (**019**) and export **LLM usage** logs (**112**); there is **no first-class export/import/duplicate** for a playable campaign. That blocks playtesting, backup before risky builds, and “send me your save.”

This epic adds **portable campaign packages**: export a campaign to a file, import on another install (or same), and optional duplicate-in-place — without exposing unrelated userData or API keys.

Builds on **003** DB paths, **019** delete, **096** file reopen harden, packaging docs. Not a cloud sync product.

## Product stance

| Question | Locked for this epic |
|----------|----------------------|
| Format? | **Single file** campaign package (SQLite copy or zip-with-manifest — SPEC picks; prefer boring and robust). |
| Secrets? | **Never** embed provider API keys or `.env`. Usage meter rows optional include/exclude (default exclude). |
| Conflict? | Import creates a **new** campaign id (or explicit replace flow with confirm) — no silent overwrite of an existing id. |

## Target UX

```
Sidebar / hub / settings (SPEC picks entry)
  ├── Export campaign… → file picker → writes package
  ├── Import campaign… → file picker → validates → new campaign in list
  └── Duplicate campaign (optional in-app, no file) → clone with new id
```

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **Export** includes world + all characters + catalog seed data needed to open (full save DB for that campaign isolation model — today one DB file per campaign or shared? SPEC must match actual `paths.ts` layout). |
| 2 | **Import** validates schema/migration version; runs migrations on open as usual. |
| 3 | **Corrupt / foreign file** → clear error; no partial half-registered campaign. |
| 4 | **RAG embed cache** may be omitted and rebuilt on open if large (SPEC); gameplay must not require shipping embeddings. |
| 5 | **Image assets** from **122/123** if present: include or rebuild — SPEC; prefer include when small tokens exist. |
| 6 | **No network upload** in v1 — local file only. |

## Definition of done

- Export produces a portable file; import on fresh userData yields a playable campaign
- Duplicate (if in scope) clones without file round-trip
- Keys never included; bad files rejected safely
- Tests for export/import round-trip + migration open
- Delivery gate including `act`

132.1 SPEC + format · 132.2 Export IPC · 132.3 Import IPC · 132.4 Duplicate (optional) · 132.5 UI entry · 132.6 Tests + smoke

## Relationship to other epics

| Epic | Integration |
|------|-------------|
| **019** | Delete remains; import is additive |
| **112** | Usage export stays separate; campaign package default excludes usage |
| **096** | Reopen/integrity patterns |
| **122** / **123** | Asset inclusion policy |
| **m005** | Remote play is not this; local file share only |

## Out of scope (v1)

- Cloud backup / accounts
- Partial export (single character only)
- Cross-major-version forever compatibility beyond migration chain
- Encrypting packages with passwords (candidate follow-up)

## Sub-tickets

### 132.1 SPEC — package format

#### Description

Document file shape, included tables/assets, id remapping, and validation errors under `src/shared/campaignPortability/` (or similar).

#### Acceptance criteria

- [x] SPEC matches on-disk campaign storage layout
- [x] SPEC locks import id policy and secret exclusion
- [x] Shared types for IPC results exported

### 132.2 Export

#### Description

Main-process export: copy/package campaign save to user-chosen path; progress/error typing.

#### Acceptance criteria

- [x] Unit/integration: export file exists and opens as SQLite (or zip per SPEC)
- [x] No API key material in package (assert absence of known env key patterns if scanned)

### 132.3 Import

#### Description

Import package → new campaign registration → appears in sidebar; open runs migrations.

#### Acceptance criteria

- [x] Round-trip test: create → export → wipe registration → import → detail loads
- [x] Corrupt file → typed error, no orphan registry row

### 132.4 In-app duplicate

#### Description

Clone campaign to a new id without file picker (if SPEC includes it).

#### Acceptance criteria

- [x] Duplicate appears as separate sidebar entry; edits don’t affect source
- [x] Test isolation of ids

### 132.5 UI entry points

#### Description

Wire Export / Import (and Duplicate) into sidebar context menu or Settings — match existing chrome patterns.

#### Acceptance criteria

- [x] Component tests or IPC-handler tests for enabled actions
- [x] Destructive overwrite (if any) requires confirm

### 132.6 Verification + smoke

#### Description

Manual smoke notes for friend-machine handoff; full delivery gate including `act`.

#### Acceptance criteria

- [x] Smoke notes: export on A → import on B (or second userData profile)
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass
