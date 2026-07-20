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
