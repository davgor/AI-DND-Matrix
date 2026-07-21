# EPIC: Highlight incoming play-view text (glow)

When the play view updates mid-session, players often miss where new text landed — especially with the Scene / Social split (**043**, **085**, **091**). This epic adds a short-lived **glow highlight** that draws the eye to the exact UI surface that just changed.

## Triggers (v1)

| # | Event | Where it highlights |
|---|--------|---------------------|
| 1 | **Scene summary changes** | Scene header (`DmExpositionSceneHeader` / `pickSceneSummary` text) |
| 2 | **New DM setting message** | The new Scene-feed line with `sceneSetting: true` (and the summary if that line also drives #1) |
| 3 | **NPC says something** | The new Social-stream bubble for an NPC `dialogue` line |

Highlight lasts a few seconds (shared duration constant, ~2–3s), then fades out. Visual: soft glow / pulse on the updated block — readable, not flashing seizure-risk strobing. Respect `prefers-reduced-motion` (static accent or shortened fade, no pulse).

## Non-goals (v1)

- Highlighting every DM narration line (only **setting** / `sceneSetting: true` plus scene-summary changes)
- Highlighting player input, party-member lines, combat banners, XP/loot, or sheet tabs
- Sound / haptics
- Multiplayer remote clients (m002/m005) — desktop host play view only for now

## Product decisions

| # | Decision |
|---|----------|
| 1 | Highlights fire only for **live** updates after the play view has mounted — **no flash** on campaign load / log hydration / history pagination. |
| 2 | Shared hook + CSS class (e.g. `incoming-highlight`) so Scene summary, Scene setting lines, and Social NPC bubbles share one timing and look. |
| 3 | Scene-summary highlight keys off **rendered summary text change**, not merely a new log id (covers region-blurb fallback as well as `sceneSetting`). |
| 4 | NPC highlight is **dialogue** reactions in Social (`speaker === 'npc'` + `reactionKind === 'dialogue'`); creature/NPC **action** lines are out of scope for v1. |
| 5 | Duration is a single constant (~2500ms) tunable in one place; glow uses existing play-view tokens / CSS variables where possible. |

## Definition of done

- All three triggers show a temporary glow on the correct surface for a few seconds
- Remount / hydrate / scroll-back history does not re-trigger highlights for old entries
- Reduced-motion path is sane
- Component/hook tests cover change detection and “no highlight on first paint”
- `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass
- `PLAY_VIEW_UX_SPEC.md` notes the highlight behavior

Broken down into **117.1–117.5**.

117.1 shared highlight hook + glow CSS · 117.2 scene summary highlight · 117.3 DM setting message highlight · 117.4 NPC dialogue Social highlight · 117.5 tests, reduced motion, UX spec

## Sub-tickets

### 117.1 117.1 — Shared incoming-highlight hook + glow CSS

#### Description

Add a reusable renderer utility for temporary “something just updated here” emphasis: a small hook (or pure helper + thin React wrapper) that applies a CSS class for a fixed duration when a watched key/value changes after mount, plus the shared glow styles used by 117.2–117.4.

Lives under `src/renderer` (e.g. `src/renderer/src/playView/incomingHighlight/` or `src/renderer/src/shared/`). Pure change-detection logic should be unit-testable without mounting the full play grid.

#### Acceptance criteria

- [x] Shared duration constant (≈2–3s) and CSS class name documented in one module
- [x] Hook/helper: on first paint with an initial value, **does not** highlight; subsequent value/key changes **do** highlight for the duration, then clear
- [x] Rapid successive changes restart (or extend) the highlight for the latest target without leaving stale glow forever
- [x] Glow CSS: soft outline/box-shadow pulse compatible with Scene header, Scene feed lines, and Social bubbles; uses play-view CSS variables where practical
- [x] Unit tests cover: no highlight on mount, highlight on change, clear after duration (fake timers)

### 117.2 117.2 — Highlight when scene summary text changes

#### Description

When the Scene column’s summary text from `pickSceneSummary` changes (new `sceneSetting` DM entry, or fallback region blurb / empty-state transition that actually changes the displayed string), apply the shared incoming highlight (117.1) to the scene summary block in `DmExpositionSceneHeader`.

#### Acceptance criteria

- [x] Changing the rendered scene summary string applies the glow class to the scene summary container for the shared duration
- [x] Initial play-view mount with an existing summary does **not** glow
- [x] Unchanged summary across unrelated log updates (e.g. non-setting DM lines, Social-only updates) does **not** re-trigger
- [x] Component test covers mount-no-glow vs summary-text-change-glow

### 117.3 117.3 — Highlight new DM setting messages in Scene feed

#### Description

When a new DM play-log entry with `sceneSetting: true` appears in the Scene feed (`filterDmExpositionEntries` / `renderFeedLine`), highlight **that feed line** (not the whole feed) with the shared glow for a few seconds. This is distinct from 117.2: the summary header may also glow if the setting updates the summary, and the new feed row should glow as the concrete message that arrived.

#### Acceptance criteria

- [x] A newly appended DM entry with `sceneSetting: true` receives the incoming-highlight class on its feed row
- [x] Non-setting DM narration lines do **not** get this highlight (v1)
- [x] Hydrated / already-present setting lines on mount do **not** glow
- [x] If multiple setting lines exist, only the newly arrived id(s) glow — older setting lines stay unhighlighted
- [x] Component test: append setting entry → that row highlighted; append normal DM line → no highlight

### 117.4 117.4 — Highlight new NPC dialogue in Social stream

#### Description

When an NPC speaks (`speaker === 'npc'`, `reactionKind === 'dialogue'`) and that line is projected into the Social stream (`filterSocialEntries` / `SocialMessage`), apply the shared incoming highlight to that message bubble (or message row) for a few seconds so players notice speech that arrived while they were watching Scene or the sheet rail.

#### Acceptance criteria

- [x] Newly appended NPC dialogue Social messages glow for the shared duration
- [x] Player messages, party-member lines, and NPC/creature **action** reactions do **not** glow (v1)
- [x] Mount / history window load does **not** glow existing NPC lines; only live appends after mount
- [x] Auto-scroll / window paging behavior from **085** still works; highlight does not break layout
- [x] Component test: append NPC dialogue → highlighted; append player / action → not highlighted

### 117.5 117.5 — Tests polish, reduced motion, UX spec

#### Description

Finish the epic: accessibility for motion preferences, a short note in the play-view UX spec, and any cross-surface regression coverage so the three triggers stay coherent.

#### Acceptance criteria

- [x] `prefers-reduced-motion: reduce` disables pulse animation (static accent or instant class without looping animation)
- [x] `PLAY_VIEW_UX_SPEC.md` documents the three highlight triggers, duration intent, and “no flash on hydrate”
- [x] Existing Scene / Social / exposition tests still pass; new tests from 117.1–117.4 remain green under full `npm test`
- [x] Manual smoke checklist noted on the ticket or spec: scene change, setting message, NPC dialogue each glow once then clear
