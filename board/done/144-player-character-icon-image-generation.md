# EPIC: Player character icon image generation

Sibling to NPC face-token epic **122**, enemy combat-token epic **123**, and companion face-token epic **139**. Scoped to **player character icons** (`characters.kind = 'player'`), plus a **campaign-settings cleanup**: collapse the two generative-token checkboxes into one.

Players already have a `portrait_path` from upload (**009.2**) and that path surfaces in play session chrome and the campaign hub cast rail. This epic adds **prompt-driven generation** during character creation, plus **regenerate** and **replace with a clean uploaded image** from the character sheet — reusing the shared image pipeline from **122** (do not fork a second stack).

Player icon Generate/Regenerate is **always available** (user-initiated). No separate player toggle — if the player never clicks Generate, nothing runs.

Builds on **009** (portrait path + file upload IPC), **122** / **123** / **139** (image provider, async enqueue, fallbacks), play chrome / hub cast surfaces that already read `portraitPath`.

## Target UX

```
Campaign start (settings cleanup)
  Before:  [ ] Generate NPC face tokens
           [ ] Generate enemy tokens
  After:   [ ] Use generative tokens?
           Off by default. When on, speaking NPCs, AI companions, and combat
           creatures get async portraits for Social / dossiers / roster
           (never blocks play). Local image models stay optional.

Character creation (009 flow) — no campaign gate
  Portrait section:
    ├── Prompt text field (appearance / look description)
    ├── [Generate] ── always available → async icon job from prompt
    └── [Upload]   ── clean image via existing files:selectPortrait
        │
        ▼
  success → preview + store path on character.portrait_path (and keep last prompt)
  failure/skip → letter/empty fallback; create never blocked

Character sheet (play sheet Character tab)
  Portrait slot shows current icon (or empty / letter fallback)
    ├── [Regenerate] ── edit/reuse prompt → new async job → replace stored asset
    └── [Replace]   ── upload clean image → overwrite portrait_path (clears generated provenance)

Surfaces (existing consumers of portrait_path)
  ├── Play session chrome portrait
  ├── Campaign hub cast rail
  └── Character sheet portrait slot (controls live here)
```

Icons are **stable per player character** once stored until the player regenerates or replaces them.

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **Player icons only (generation scope).** Speaking-NPC tokens stay on **122**; enemies on **123**; AI companions on **139** — this epic owns player create/sheet UX, not those generators. |
| 2 | **No player campaign toggle.** Generate / Regenerate are always offered. Unused = no cost. Upload/Replace always available. |
| 3 | **One campaign toggle: "Use generative tokens?"** Replaces separate NPC + enemy checkboxes. Default **OFF**. When ON, gates auto enqueue for speaking NPCs, AI companions, and enemy/creature tokens (same behavior those epics already had under their flags). |
| 4 | **User-initiated player icons via prompt.** Runs when the player enters a prompt and clicks Generate (create) or Regenerate (sheet) — not auto-enqueued from name/class alone, and **not** gated by "Use generative tokens?". |
| 5 | **Reuse 122 pipeline.** Same `ImageProvider` / mock-provider contract and orchestration style as NPC/companion face tokens; entity kind `player_character` (or equivalent). Do not fork a second image stack. |
| 6 | **Persist on existing `portrait_path`.** Generated and uploaded icons share the same column/lifecycle already used by **009.2**; asset files live under app data (e.g. `portraits/` / dedicated player-icon dir). |
| 7 | **Store last prompt.** Persist the appearance prompt used for the current generated icon so Regenerate can prefill/edit it. Upload/Replace may clear generated-prompt provenance. |
| 8 | **Face-token framing.** Head/shoulders player portrait suitable for chrome circle + sheet slot — not full-body combat tokens, not scene backgrounds. |
| 9 | **Local provider (llamacpp) default OFF.** Mock/cloud paths must work without assuming local LLM painting (same as **122** / **123**). |
| 10 | **Non-blocking.** Character create submit, enter-play, sheet open, and chrome/hub render never wait on image generation. Pending state may show on the portrait slot. |
| 11 | **Fallback.** Chrome / hub / sheet: letter initial or empty slot when no portrait — never a broken image. |
| 12 | **Replace with clean image.** Sheet (and create) Upload overwrites any generated icon with the selected file; path update survives restart. |
| 13 | **Regenerate replaces prior asset.** New successful generation overwrites `portrait_path`; failed regen leaves the previous icon intact. |
| 14 | **Toggle migration.** Existing campaigns: single flag ON if either legacy NPC or enemy flag was ON; otherwise OFF. Readers/writers converge on one field (legacy columns may alias/migrate — keep DB upgrade safe). |

## Definition of done

- Campaign start UI shows a single **"Use generative tokens?"** checkbox (default OFF); NPC + enemy separate toggles removed
- That one flag gates NPC, companion, and enemy auto token enqueue the same way the old flags did
- Character creation exposes prompt + Generate + Upload (no campaign gate on Generate); prompt and path persist on the player row
- Typed player-icon generation contract + prompt builder; mock provider unit tests; shares **122** pipeline
- Asset persisted on `portrait_path`; survives restart; last prompt stored for regenerate prefills
- Character sheet shows portrait with Regenerate and Replace/Upload
- Play chrome + hub cast continue to prefer stored portrait; letter/empty fallback otherwise
- Provider failure never blocks create submit or play; prior icon kept on failed regen
- `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass; **act** CI workflows (`pr-checks`, `deadcode`) succeed

144.1 unify toggle → 144.2 generation contract → 144.3 persist + prompt storage → 144.4 create-flow Generate + Upload → 144.5 sheet Regenerate + Replace → 144.6 surfaces + fallbacks → 144.7 docs + delivery gate

## Relationship to other epics

| Epic | Integration |
|------|-------------|
| **122** (NPC face tokens) | Shared image provider; enqueue now reads unified generative-tokens flag |
| **123** (enemy tokens) | Enqueue reads same unified flag (was `enemyTokenGenerationEnabled`) |
| **139** (companion face tokens) | Enqueue reads same unified flag (was NPC flag) |
| **009** | Portrait upload IPC + `portrait_path` column; this epic extends create UX and sheet controls |
| Play chrome / hub cast | Already display `portraitPath`; verify no regression when generated |

## Out of scope (this epic)

- Replacing NPC / enemy / companion *generation implementations* (only their **campaign gate** + player create/sheet UX)
- Full-body / battle-map tokens
- Scene / region / DM / player-view background images
- Auto-generating a player icon with no prompt
- Blocking create or play on image completion
- Requiring local llamacpp for v1 ship criteria
- Changing companion or NPC asset directories

## Sub-tickets

### 144.1 Unify campaign toggle → "Use generative tokens?"

#### Description

Replace the two campaign-start checkboxes ("Generate NPC face tokens" / "Generate enemy tokens") with one: **"Use generative tokens?"** (default OFF). Wire NPC, companion, and enemy enqueue paths to that single flag. Migrate existing campaign rows safely (ON if either legacy flag was ON).

#### Acceptance criteria

- [x] Campaign start UI shows only **"Use generative tokens?"** with short hint covering NPCs, companions, and combat creatures; async / never blocks play
- [x] Separate NPC / enemy checkbox UI removed
- [x] NPC, companion, and enemy schedulers enqueue only when the unified flag is ON
- [x] Create/validation/repo tests cover default false, true persistence, and migration/alias from legacy flags
- [x] Docs/SPEC for **122** / **123** / **139** note the unified flag name

### 144.2 Player-icon generation contract + prompt

#### Description

Typed request/response for player icon generation: player identity fields + free-text appearance prompt, portrait framing constraints. Prompt builder + mock provider tests; reuse **122** `ImageProvider` primitives. Not gated by the campaign generative-tokens flag.

#### Acceptance criteria

- [x] Shared/typed contract for entity kind `player_character` (name as implemented)
- [x] Prompt builder produces head-and-shoulders framing from the user appearance prompt (+ basic identity context)
- [x] Mock provider success + failure unit tests; no llamacpp required

### 144.3 Persist asset + last prompt lifecycle

#### Description

Write generated (or uploaded) icon to app-data storage; bind path to player `portrait_path`. Persist last generation prompt for regenerate prefills. Clear or null prompt provenance on clean Upload/Replace.

#### Acceptance criteria

- [x] Generated file written and `portrait_path` updated; survives DB reload / restart
- [x] Last prompt stored and readable for sheet Regenerate prefill
- [x] Upload/Replace overwrites path; generated-prompt provenance cleared (or equivalent documented behavior)
- [x] Failed generation does not clear an existing good `portrait_path`
- [x] Repo/unit tests for write, read, replace, failed-regen keep-previous

### 144.4 Character creation — prompt Generate + Upload

#### Description

In character creation portrait UI: appearance prompt field, Generate, and Upload clean image (existing file picker). Generation is always offered (no campaign gate), async/non-blocking; create submit never waits on the provider.

#### Acceptance criteria

- [x] Create UI shows prompt + Generate + Upload
- [x] Successful Generate sets draft/persisted `portraitPath` and stores prompt
- [x] Provider throw/timeout → create can still complete; fallback portrait state
- [x] Component/controller tests for Generate success and failure

### 144.5 Character sheet — Regenerate + Replace

#### Description

On the play sheet Character tab, show the current portrait and actions: Regenerate (prefill last prompt) and Replace (upload clean image). Regenerate enqueues a new job and replaces the asset on success only. No campaign gate.

#### Acceptance criteria

- [x] Sheet shows current portrait or empty/letter fallback (no broken image)
- [x] Regenerate prefills last prompt, allows edit, enqueues job, updates portrait on success
- [x] Failed regenerate leaves previous portrait intact
- [x] Replace uploads a clean image and overwrites `portrait_path`
- [x] Component/IPC tests for regenerate success/failure and replace

### 144.6 Chrome / hub surfaces + fallbacks

#### Description

Confirm play session chrome and campaign hub cast rail still prefer `portraitPath` when set and fall back cleanly when missing or unloadable. No broken-image placeholders.

#### Acceptance criteria

- [x] Chrome + hub: portrait when path set; letter/empty fallback otherwise
- [x] Image load error falls back without a broken icon
- [x] Existing chrome/hub tests updated or extended as needed

### 144.7 Docs + delivery gate

#### Description

Cross-link README / **122** / **123** / **139**; document unified **"Use generative tokens?"** flag and player prompt-driven create/sheet flows. Full delivery gate including `act`.

#### Acceptance criteria

- [x] README / face-token SPEC documents unified toggle + player icon entity kind and create/sheet flows
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass
- [x] `act` PR-checks + deadcode workflows succeed
