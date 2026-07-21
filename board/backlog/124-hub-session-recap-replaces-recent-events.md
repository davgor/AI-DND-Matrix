# EPIC: Campaign Hub session recap (replace Recent events)

The Campaign Hub world preview still shows a raw **Recent events** list — timestamped dumps of narration snippets, player inputs (`*I pick up the sword…*`), and stub lines like `npc reaction`. That is hard to scan when returning to a campaign and duplicates what the event log already stores.

This epic **replaces that list with an auto-generated “Previously on…” session recap**: short prose that reminds the player where they left off. On hub boot, show a **loading** state while the recap is resolved; **persist** the result so reopen does not burn tokens when nothing new has been played.

Builds on **038** (Campaign Hub + `PlayAwareHubSnapshot` + Recent events slice), existing **`campaigns:generateRecap` / `play.recap`** (`src/main/recapIpc.ts`), hub **Last played** / sessions `last_played_at`, and play-view recap UI (`RecapBanner` / `useSessionRecap`) as optional reuse — hub is the primary surface for this epic.

## Target UX

```
Open hub-eligible campaign
  └── Campaign Hub boots
        │
        ▼
  Session recap section (replaces “Recent events”)
        │  no persisted recap, OR lastPlayedAt > recap.generatedAt
        │     → show loading affordance → LLM generate → persist → render
        │  lastPlayedAt ≤ recap.generatedAt (recap already covers leave-off)
        │     → show persisted text immediately (no LLM call)
        ▼
  Player reads “Previously on…” then picks a cast member / continues
```

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | **Replace hub Recent events.** Remove `HubRecentEventsSection` (and hub snapshot dependence on a player-facing raw event list for this panel). Do not keep a dual “events + recap” list in v1. |
| 2 | **Auto-generate on hub boot.** Opening the Campaign Hub triggers recap resolution without a manual “Generate recap” click. Show a clear loading affordance in the recap section while generation is in flight. |
| 3 | **Freshness gate vs last played.** Persist recap text + `generatedAt` (ISO). **Regenerate** only when there is no stored recap **or** campaign `lastPlayedAt` is **strictly after** `generatedAt`. **Skip** generation when `lastPlayedAt` is at or before the stored recap time (recap already covers the leave-off). Empty/never-played edge: use the existing empty-story copy path (no useless LLM call when there are no events). |
| 4 | **Campaign-scoped.** One recap per campaign (same scope as hub recent events + current `generateRecap(campaignId)`). Not per character in v1. |
| 5 | **Reuse `play.recap`.** Extend/persist around `generateSessionRecap` + purpose `play.recap`; keep the 2–4 sentence “previously on…” brief. Do not invent a second recap agent. |
| 6 | **Emphasis-safe display.** Render recap body with existing `FormattedText` / emphasis path (same as other hub prose). |
| 7 | **Play-view recap modal.** Out of scope to redesign, but prefer sharing persisted text / load helpers if cheap so hub and optional play-view “view recap” do not diverge. Manual regenerate in play-view may remain; hub must not require it. |

## Definition of done

- Hub no longer shows the raw Recent events list; Session recap section is the leave-off reminder
- First hub open (or after new play past the stored recap) auto-generates with a visible loading state, then shows prose
- Reopening the hub when `lastPlayedAt` is not after the stored `generatedAt` shows the cached recap with **no** new LLM call
- Recap survives app restart (SQLite persistence)
- Unit/component tests cover freshness gate, empty-events path, loading → content UI, and hub snapshot/API shape changes
- `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass

124.1 SPEC + persistence contract · 124.2 DB + repository · 124.3 IPC load/generate-with-gate · 124.4 Hub UI replace + boot loading · 124.5 Tests + smoke notes

## Relationship to other epics

| Epic / code | Integration |
|-------------|-------------|
| **038** | Hub world preview owns the surface; replace recent-events panel introduced there |
| `recapIpc.ts` | Generation + `play.recap` metering purpose |
| Sessions / `last_played_at` | Freshness comparison source (`listCampaignsByLastPlayed` / touch-on-select) |
| Play-view `useSessionRecap` | Optional consumer of persisted recap; not required for hub DoD |
| **040** / **112** | Stay within existing recap token cap and purpose tagging |

## Out of scope (v1)

- Per-character or per-session multi-recap history / timeline of past recaps
- Streaming token-by-token recap UI (loading → full text is enough)
- Replacing Scene/Social history or the character journal with recap
- Forcing play-view modal redesign or auto-popup on every enter-world
- Editing / regenerating-from-hub button (follow-up if players want a manual refresh)

## Sub-tickets

### 124.1 SPEC + persistence / freshness contract

#### Description

Document the hub session-recap contract (fields, freshness rule, empty-events behavior, hub boot sequence) under `src/shared/` (e.g. `campaignHub` or `sessionRecap`) so DB, IPC, and UI implement the same gate.

#### Acceptance criteria

- [ ] SPEC defines persisted shape: at minimum `{ text, generatedAt }` campaign-scoped
- [ ] SPEC locks freshness: generate iff no row **or** `lastPlayedAt > generatedAt`; otherwise return stored text without LLM
- [ ] SPEC defines empty-events / never-played copy and “no LLM” behavior
- [ ] SPEC states hub Recent events UI is removed in favor of Session recap

### 124.2 DB migration + repository

#### Description

Forward-only migration to store the campaign session recap (column(s) on `campaigns` or a small 1:1 table). Repository get/upsert round-trip; existing saves open cleanly with null/absent recap.

#### Acceptance criteria

- [ ] Migration applies on existing saves; missing recap reads as absent
- [ ] Repository tests cover upsert, read, and isolation across campaigns
- [ ] Schema/types exported for IPC/shared use

### 124.3 IPC: load or generate with freshness gate

#### Description

Expose a hub-facing API (extend `generateRecap` or add `getOrGenerateSessionRecap`) that: reads `lastPlayedAt` + stored recap; skips LLM when fresh; otherwise generates via existing `generateSessionRecap`, persists, returns text. Meter under `play.recap`.

#### Acceptance criteria

- [ ] Unit/integration tests: fresh skip (stub provider **not** called); stale/missing path calls provider once and persists
- [ ] Empty events returns start-of-story copy without provider call (match or preserve current empty behavior)
- [ ] Preload/renderer typings updated for the new/changed channel

### 124.4 Hub UI: replace Recent events + boot loading

#### Description

Replace `HubRecentEventsSection` with a Session recap section. On hub mount/boot, resolve recap (124.3) showing a loading affordance, then render text (or empty copy). Drop `recentEvents` from the player-facing hub snapshot if no longer needed (or stop sending it to the preview).

#### Acceptance criteria

- [ ] Hub preview shows “Session recap” (or equivalent title), not “Recent events”
- [ ] Loading state visible while generation runs; content appears when ready
- [ ] Cached path renders without a stuck loading spinner
- [ ] Component tests cover loading → content and empty states
- [ ] Fixtures/tests that asserted hub `recentEvents` UI updated

### 124.5 Verification + smoke notes

#### Description

Wire end-to-end confidence: freshness across restart, hub boot loading, and no double-generate on immediate reopen. Note any manual smoke steps in a short runbook blurb if useful.

#### Acceptance criteria

- [ ] Automated tests cover restart persistence (write → reopen DB → same text, no regenerate when lastPlayed unchanged)
- [ ] Smoke notes (ticket or `docs/runbooks`) describe: play a turn → leave hub → reopen → new recap; reopen again without play → same recap / no extra generate
- [ ] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass
