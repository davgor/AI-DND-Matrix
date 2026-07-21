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

## Sub-tickets

### 118.1 — D20 overlay trigger contract + product lock

#### Description

Document when the animated D20 fires, what number it shows, how it interacts with **Show rolls**, and reduced-motion / concurrency rules. Prefer a short shared module under `src/renderer` (e.g. `playView/d20Overlay/`) with pure helpers + constants that later tickets import — not only markdown.

Lock the Show-rolls behavior from epic 118 (animation when rolls hidden vs fully suppressed) so 118.4 does not invent policy.

#### Acceptance criteria

- [x] Spec (comment block or `d20Overlay.md` next to the module) states: trigger = new live `check.roll` after mount; face = natural `check.roll`; replace-in-flight; pointer-events none
- [x] Pure helper(s) decide “should animate?” given previous/next check identity + mounted flag (unit-tested)
- [x] Show-rolls interaction for face/label persistence is documented and encoded in a named constant or policy function
- [x] Duration / path constants live in one place (tunable without hunting CSS)

### 118.2 — D20 visual component (settled face)

#### Description

Build a reusable renderer component for a stylized twenty-sided die that can display a face value `1–20`. This is the visual used during tumble frames and at settle — not the small randomize icon in campaign create (`FieldRandomDiceButton`).

Keep it CSS/SVG-friendly, themeable via play-view variables, and unit-testable for the displayed face / aria label.

#### Acceptance criteria

- [x] Component renders a recognizable D20 and shows the given face number clearly at settle size
- [x] Accepts `face: number` (1–20) and optional size/className; invalid values handled safely (clamp or guard — documented)
- [x] Accessible: `aria-hidden` while tumbling if decorative, or `role="img"` + label when result is meant to be announced
- [x] Visuals use play-view tokens / CSS variables; no WebGL dependency
- [x] Component test asserts the settled face text/label for a sample roll

### 118.3 — Travel / tumble animation

#### Description

Implement the motion: the D20 enters from one side of the play view, tumbles/rolls across, and settles (brief hold) before exit/clear. Prefer CSS animation or a small Web Animations API wrapper driven by the constants from 118.1 — keep `/engine` untouched.

Overlay host should be a single portal/layer child of the play view root so it spans Scene + Social columns.

#### Acceptance criteria

- [x] Animation path reads as “rolling across the screen” (horizontal travel + rotation/tumble), not a tiny local spin in the feed
- [x] Settled hold long enough to read the face, then clears without leaving orphan DOM
- [x] `pointer-events: none` on the overlay; play input remains usable during the animation
- [x] New animation request replaces the current one (no stacked dice)
- [x] Styles scoped under a dedicated CSS file; respects epic visual-language note (no purple-glow default)

### 118.4 — Wire play view `lastCheck` to D20 overlay

#### Description

Connect the overlay to live turn outcomes: when `usePlayViewController` / turn submit sets a new `lastCheck` with a d20 `roll`, start the overlay using 118.1 policy. Do not re-trigger on first mount with a hydrated/stale check.

Keep the existing Scene-feed `formatRoll` line when Show rolls is on; overlay is additive spectacle.

#### Acceptance criteria

- [x] New live `lastCheck` with `roll` starts the D20 overlay in the in-campaign play view
- [x] Remount / first paint with an existing `lastCheck` does **not** animate
- [x] Show-rolls policy from 118.1 applied (face persistence / clear behavior)
- [x] Non-check turns (no `check`) do not flash the die
- [x] Integration or component test with fake timers covers fire-on-change and no-fire-on-mount

### 118.5 — Reduced motion, tests, UX spec

#### Description

Finish the epic: `prefers-reduced-motion` path, harden tests, and document the behavior in `src/shared/inCampaignLayout/PLAY_VIEW_UX_SPEC.md` so future play-view work knows the D20 overlay exists and when it fires.

#### Acceptance criteria

- [x] Reduced-motion: no long travel tumble; brief settle/fade (or static result flash) then clear — covered by test or documented CSS media query with a behavioral assertion
- [x] Unit/component tests cover: mount no-fire, change fires, replace-in-flight, face equals `check.roll`
- [x] `PLAY_VIEW_UX_SPEC.md` notes trigger, Show-rolls interaction, and reduced-motion behavior
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` pr-checks + deadcode pass for the epic as a whole
