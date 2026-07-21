# Hub session recap — contract (epic **124**)

Campaign Hub world preview shows an auto-generated **“Previously on…”** session recap instead of a raw **Recent events** list. On hub boot the recap is resolved with a loading affordance; the result is **persisted** so reopen does not burn tokens when nothing new has been played.

Builds on **038** (Campaign Hub + `PlayAwareHubSnapshot`), existing `generateSessionRecap` / purpose `play.recap` (`src/main/recapIpc.ts`), sessions `last_played_at`, and optional play-view reuse (`useSessionRecap`). Shared DTOs and the freshness helper live in `src/shared/sessionRecap/types.ts`.

## Locked product decisions

| # | Decision |
|---|----------|
| 1 | **Replace hub Recent events.** Remove `HubRecentEventsSection` (and stop depending on a player-facing raw event list for this panel). No dual “events + recap” list in v1. |
| 2 | **Auto-generate on hub boot.** Opening Campaign Hub triggers recap resolution without a manual “Generate recap” click. Show a clear loading affordance while generation is in flight. |
| 3 | **Freshness gate vs last played.** Persist `{ text, generatedAt }`. **Regenerate** only when there is no stored recap **or** campaign `lastPlayedAt` is **strictly after** `generatedAt`. **Skip** LLM when `lastPlayedAt` is at or before the stored recap time (or `lastPlayedAt` is null with a stored recap). |
| 4 | **Campaign-scoped.** One recap per campaign (same scope as current `generateRecap(campaignId)`). Not per character in v1. |
| 5 | **Reuse `play.recap`.** Extend/persist around `generateSessionRecap` + purpose `play.recap`; keep the 2–4 sentence brief. Do not invent a second recap agent. |
| 6 | **Emphasis-safe display.** Render recap body with existing `FormattedText` / emphasis path. |
| 7 | **Play-view recap modal.** Out of scope to redesign; prefer sharing persisted text / load helpers if cheap. Manual regenerate in play-view may remain; hub must not require it. |

## Persisted shape

Campaign-scoped (columns on `campaigns` or 1:1 table):

| Field | Purpose |
|-------|---------|
| `text` | 2–4 sentence “previously on…” prose (or empty-events copy) |
| `generatedAt` | ISO-8601 when this text was written |

Type: `PersistedSessionRecap`. Helper: `needsSessionRecapRegeneration({ stored, lastPlayedAt })`.

1. `stored === null` → **true** (generate)
2. `lastPlayedAt === null` with existing store → **false** (return stored; no LLM)
3. `lastPlayedAt > generatedAt` → **true** (regenerate and persist)
4. `lastPlayedAt <= generatedAt` → **false** (return stored; no LLM)

## Empty events / never-played

When the event log has no events for the campaign, return `SESSION_RECAP_EMPTY_COPY` (“This is the start of your story — nothing has happened yet.”) **without** calling the LLM. Persist that copy with `generatedAt` so a hub reopen with no new play does not regenerate. Never-played / empty edge must not burn tokens.

## Hub boot sequence

```
Open hub-eligible campaign
  └── Campaign Hub boots
        │
        ▼
  Session recap section (title: SESSION_RECAP_HUB_SECTION_TITLE = "Session recap")
        │  no persisted recap, OR lastPlayedAt > recap.generatedAt
        │     → show loading → getOrGenerateSessionRecap → persist → render
        │  lastPlayedAt ≤ recap.generatedAt (or null lastPlayed with store)
        │     → show persisted text immediately (no LLM call)
        ▼
  Player reads leave-off prose, then picks a cast member / continues
```

IPC returns the resolved text (and may expose `generatedAt` / `fromCache` for tests). Meter generation under `play.recap`.

## Hub UI

- Section title: **Session recap** (not “Recent events”).
- Loading → content (or empty copy) in the recap section.
- `PlayAwareHubSnapshot.recentEvents` is no longer required for the world preview panel; drop or stop sending to the preview once the UI lands (**124.4**).

## Out of scope (v1)

- Per-character / multi-recap history
- Streaming token-by-token UI
- Hub manual regenerate button
- Forcing play-view modal redesign
