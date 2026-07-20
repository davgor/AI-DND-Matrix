# EPIC: Animated D20 rolls across the play view

When the DM resolves a check and a d20 is rolled, players currently only see a quiet text line in the Scene feed (`formatRoll` / `lastCheck`, gated by **Show rolls**). This epic adds a short **full-play-view animation**: a D20 tumbles/rolls across the screen, then settles on the rolled face so the moment of chance is visible and dramatic.

Builds on existing engine rolls (`rollD20` / `resolveCheck` in `/engine/checks`), turn IPC `TurnResult.check`, and play-view `lastCheck` + `showRolls` preference (**PlaySessionChrome** toggle).

## Player fantasy

- Something important is being decided → a die actually *moves* across the table (screen).
- The final face matches the authoritative engine roll (no fake theater that disagrees with rules).
- Optional: players who hide roll math still get (or can skip) the spectacle — product decision below.

## Trigger (v1)

| Event | Source today | Overlay behavior |
|-------|----------------|------------------|
| Ability/skill/attack **check** resolved with a d20 | `TurnResult.check` → `setLastCheck` after turn submit | Start animation when a **new** live check arrives after play view mount |
| Contested / flee disengage rolls that surface as the same `check` shape | Same path if already on `lastCheck` | Same overlay |
| Damage dice, initiative list text, character-setup ability rolls | Out of scope for v1 | No overlay |

Fire only for **live** session updates — not on campaign load / hydration of an old `lastCheck`.

## Non-goals (v1)

- 3D physics engine or WebGL dice table
- Animating every damage die / multi-die weapon formula
- Remote multiplayer clients (m002/m005) — desktop host play view only
- Replacing the text roll line entirely (keep `formatRoll` when Show rolls is on; overlay is the spectacle)
- Sound / haptics (optional stretch later)

## Product decisions

| # | Decision |
|---|----------|
| 1 | **Authoritative face.** The settled D20 face equals `check.roll` (natural d20 before modifiers). Total/DC stay in the existing text line when Show rolls is on. |
| 2 | **Show rolls gating.** If Show rolls is **off**, v1 still plays the animation but does **not** leave a persistent numeric face/label after settle (or shows face briefly then clears) — spectacle without spoiling the math line. Document exact behavior in 118.1. |
| 3 | **One die at a time.** A new check while an animation is running cancels/replaces the in-flight overlay (no pile-up). |
| 4 | **Reduced motion.** `prefers-reduced-motion: reduce` → skip travel tumble; brief fade/pop of settled face (or static flash), then clear. |
| 5 | **Overlay layer.** Fixed/absolute layer above play columns, pointer-events none, does not steal focus or block input. |
| 6 | **Visual language.** Stylized flat/CSS or SVG D20 (not the campaign-create randomize button icon). Match play-view tokens; avoid purple-glow cliché. |

## Definition of done

- Live DM check → D20 animates across the play view and settles on the correct natural roll
- No re-fire on remount/hydrate; rapid checks replace cleanly
- Reduced-motion path is sane; overlay never blocks clicks
- Show-rolls interaction matches locked decision in 118.1
- Component/hook tests + UX spec note in `PLAY_VIEW_UX_SPEC.md`
- `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass

Broken down into **118.1–118.5**.

118.1 trigger contract + product lock · 118.2 D20 visual component · 118.3 travel/tumble animation · 118.4 play-view wiring to `lastCheck` · 118.5 reduced motion, tests, UX spec
