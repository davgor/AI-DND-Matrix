# Multi-PC shared time — Model B (epic **133**)

Campaign Hub (**038**) hosts multiple player characters in one live shared world. Time is a **single campaign clock** (`campaigns.in_game_date`). Rest and travel advance that clock for whoever is active. Inactive PCs are AI-proxied when encountered, but they do **not** keep a private calendar.

This SPEC locks **Model B**: shared campaign clock + per-PC last-active world-day watermark + deterministic away digest. Shared DTOs and pure helpers live in `src/shared/sharedTime/types.ts`.

Builds on **038** (hub cast), day counter / rest / travel clamps, sessions `last_played_at` (wall-clock only), **124** session recap (complementary leave-off prose — not the time model). Complements **130** (world mutations are world-scoped on the same clock).

## Locked product decisions

| # | Decision |
|---|----------|
| 1 | **Model B.** One shared campaign clock + per-PC `lastActiveInGameDate` watermark + optional deterministic away digest. **Rejected:** Model C (full per-PC calendars). Model A (copy-only, no watermark) is insufficient for away UX. |
| 2 | Rest / travel always advance the **campaign** clock (`advanceInGameDate`). Never a per-PC clock. |
| 3 | Watermark updates when a PC successfully plays (including short rest), long-rests, or travels — set to the **current** campaign `in_game_date` after any clock advance in that turn. |
| 4 | Away digest is **deterministic** from watermark gap (+ optional event headlines). LLM optional later; not required for DoD. Digest is derived — **not** a second clock. |
| 5 | Hub shows world day + per-cast last-active without implying timeline divergence. |
| 6 | Inactive proxy / DM grounding includes current world day and away gap when relevant; proxy must not invent a private calendar. |

## Non-goals (v1)

- Parallel calendars / instance dungeons per PC
- Season / weather simulation
- Automatic off-screen adventures or XP grind for inactive PCs

## Data shapes

| Field | Location | Authority |
|-------|----------|-----------|
| `in_game_date` | `campaigns` | Sole source of truth for “now” (world day) |
| `last_active_in_game_date` | `characters` | Per-PC watermark; default `0` for legacy rows |
| `sessions.last_played_at` | sessions | Wall-clock recency only — **not** world day |

Types: `CharacterTimeWatermark`, `AwayDigest`, `AwayDigestInput`, `SharedTimeCastFields`.

Helpers: `computeAwayDays`, `isAwayFromClock`, `buildAwayDigest`, `formatWorldDayLabel`, `formatLastActiveLabel`, `formatAwayBlurb`, `formatSharedTimeGrounding`.

## Away digest rules

1. `awayDays = max(0, worldDay - lastActiveInGameDate)`
2. `awayDays === 0` → no digest / empty blurb
3. Otherwise → deterministic summary naming shared world time + optional ≤ `AWAY_DIGEST_MAX_HEADLINES` event headlines
4. Never describe a personal calendar or “Bob’s day N while Alice is on day M” as separate clocks

## Hub / play UX

- Header: world day from `campaign.inGameDate` (label: “World day”)
- Cast rail: “Last active: day N” per living PC
- Resume / select lagging PC: optional away blurb from `formatAwayBlurb` / `buildAwayDigest`
- Copy must not imply separate timelines

## Grounding

DM narration context and inactive-player proxy prompts include shared world day (+ away gap when > 0) and the standing rule: **do not invent a private calendar**.

## Out of scope (v1)

- Multiplayer synchronized clocks (**m002**)
- Rewriting historical events onto a day index
- LLM-authored away digests as a hard requirement
