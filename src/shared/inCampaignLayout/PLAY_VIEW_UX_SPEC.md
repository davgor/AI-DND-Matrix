# Play view UX specification (Epic 043)

Renderer-only UX contract for the in-campaign four-column play shell. Turn resolution, log routing filters, and IPC boundaries from epics **010**, **018**, **029**, and **038** are unchanged.

## Non-goals

- No turn-loop or LLM routing changes (**029**, **040**)
- No campaign hub layout redesign (**038**)
- No new gameplay mechanics (quests, map UI, image generation)

**Log split (updated by 091):** Scene = **DM only** (flavor / narration). Social = player **raw** input + NPC/party dialogue and actions. Player `actionExpression` restatements (e.g. “X says …”) are excluded from both columns — the typed line is what persists in Social. See `filterDmExpositionEntries` / `filterSocialEntries`.

## Layout hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│ Play session chrome (all layout modes)                          │
├──────┬──────────────────────────────┬─────────────┬─────────────┤
│ Camp │ Scene summary                │ Social      │ Sheet tabs  │
│ rail │ Combat strip (collapsible)   │ chat stream │ Combat/Char │
│      │ Status alerts (max 2 + more) │             │ Gear/Journal│
│      │ Story feed (auto-scroll)     │ Composer ▼  │             │
└──────┴──────────────────────────────┴─────────────┴─────────────┘
```

## Session chrome

Full-width bar above the grid in every `InCampaignLayoutMode`.

| Field | Source |
|-------|--------|
| Character name + portrait thumbnail | Active character via `window.characters.listByCampaign` |
| Region label | `character.stats.currentRegionId` → region name from `window.campaigns.select` |
| In-game day | `campaign.inGameDate` from campaign detail |
| Combat badge | Shown when `combatState` is non-null; round summary on hover |
| Return to Campaign Hub | `onExitToCampaignHub` — **confirm dialog only when combat is active** |
| Show rolls toggle | `rollVisibilityPreference.ts` (moved out of DM feed, epic 043.9) |

Optional: campaign name when campaigns rail is collapsed.

## Scene summary vs feed

- **Scene summary** (`pickSceneSummary`): synthesized stage context, not the latest DM narration line.
  1. Latest DM log entry with `sceneSetting: true`
  2. Else region description blurb passed from campaign state
  3. Empty: `The scene is quiet…` (append region name when known)
- **Feed**: DM-only history from `filterDmExpositionEntries` (never player words); speaker labels on each line.

Social column uses `filterSocialEntries` (player raw + NPC/party lines) as a chat stream with avatar bubbles (**085** / **091**). Typed player input is always projected into the log (**087**) and remains after turn resolve (**088**). Social renders a sliding window of the newest **100** messages; scrolling near the top streams in the previous page of 100 (`socialStreamWindow` / `useSocialStreamWindow`).

## Play sheet tabs

`PlaySheetRail` replaces full `CharacterSheetBody` in the 280px rail.

| Tab | Content |
|-----|---------|
| Combat | HP, AC, conditions, equipped weapon, key stats |
| Character | Abilities, perks, identity summary |
| Gear | Compact inventory / equipment |
| Journal | Character journal entries (not play speech log) |

**Default tab:** Combat when `combatState` is non-null; otherwise Character. When combat starts, tab switches to Combat automatically. Tab choice is not persisted across sessions (combat transition drives default).

Log book opens from Character or Gear via existing modal pattern.

## Ask the DM (OOC)

Out-of-character player ↔ DM chat (epic **106**) opens from the Journal tab action list **directly under** “Open spellbook”. Full contract: [`ASK_THE_DM_OOC_SPEC.md`](./ASK_THE_DM_OOC_SPEC.md). Hard rule: OOC send never invokes `turn:resolve` / `resolvePlayerTurn`.

## Overlay z-index stack

Lowest → highest (implementation in CSS):

| Layer | z-index | Notes |
|-------|---------|-------|
| Grid columns | 0 | Base play layout |
| In-campaign overlays container | 5 | Recap, promotion, D20 overlay (pointer-events on children; D20 forces none) |
| Recap / promotion banners | 10 | Centered top; light scrim optional |
| Animated D20 roll overlay | 12 | Non-blocking spectacle; `pointer-events: none` |
| Sheet overlay rail (`sheet-overlay`, `compact`) | 20–25 | Right rail when expanded |
| Campaigns overlay rail (`compact`) | 30 | Left rail when expanded |
| Overlay backdrop | 15 | Semi-transparent; click/Escape dismiss |
| Ask the DM / Spellbook / Recap dialog / journal notes | 200 | Shared `.modal-overlay` (see Ask the DM spec) |
| Level-up modal | 1000 | Full-screen scrim + dialog |
| Obituary drafting modal | 1100 | Above level-up when both could appear |

Recap & promotion must not trap focus above level-up or obituary modals.

## Responsive overlay rails

At `sheet-overlay` and `compact`:

- Semi-transparent backdrop when campaigns or sheet rail is expanded as overlay
- Click backdrop or **Escape** closes the topmost expanded overlay rail
- Dismiss does not corrupt saved rail-collapse preferences in `localStorage`

## Status alerts

`PlayStatusAlerts` consolidates alignment shift, imprisoned, defeat disposition, XP, and loot banners. Max 2 visible + expander. XP/loot auto-dismiss after 8 seconds.

## Animated D20 roll overlay (epic 118)

When a live DM check resolves with a natural d20 (`TurnResult.check.roll`), a stylized D20 tumbles across the play view and settles on that face. Module: `playView/d20Overlay/`.

| Rule | Behavior |
|------|----------|
| Trigger | New `lastCheck` after play view mount (`observeLiveCheck`) — not on first paint / hydrate |
| Face | Natural `check.roll` (1–20); total/DC stay in the Scene `formatRoll` line when Show rolls is on |
| Show rolls on | Settled face label readable through settle hold; text roll line unchanged |
| Show rolls off | Animation still runs; face uses **brief-then-clear** (no persistent numeric spoil) |
| Concurrency | One die at a time — a newer check replaces the in-flight overlay |
| Reduced motion | No travel tumble; brief centered fade/pop then clear |
| Input | Overlay is `pointer-events: none`; never blocks play controls |

### Manual smoke

1. Enter play with an existing `lastCheck` in session state — no D20 on first paint.
2. Resolve a check (Show rolls on) — die travels, settles on natural roll; Scene still shows `formatRoll`.
3. Toggle Show rolls off, resolve another check — animation plays; face does not linger as a persistent label.
4. With OS reduced-motion enabled — brief flash only, no long travel.

## Incoming text highlight (epic 117)

Short-lived glow (`incoming-highlight`, ~2.5s) draws the eye to live play-view updates. Shared hook + CSS under `playView/incomingHighlight/`.

| Trigger | Surface |
|---------|---------|
| Scene summary text changes (`pickSceneSummary`) | Scene header summary block |
| New DM log entry with `sceneSetting: true` | That Scene feed row |
| New NPC `dialogue` Social line | That Social message bubble |

**No flash on hydrate:** highlights fire only for live appends/changes after the play view has mounted — campaign load, log hydration, and Social history window paging do not re-glow old entries.

**Reduced motion:** `prefers-reduced-motion: reduce` keeps a static gold accent (no pulse animation).

### Manual smoke

1. Enter play mid-session with existing Scene summary / setting lines / NPC dialogue — nothing should glow on first paint.
2. Trigger a scene setting change — summary and new setting feed row glow, then clear.
3. Receive NPC dialogue in Social — that bubble glows; player lines and NPC/creature actions do not.

## Open decisions (resolved)

1. **Hub exit mid-session:** exit immediately; confirm **only when combat is active**.
2. **Sheet rail default tab:** Combat when combat active, else Character; auto-switch to Combat on combat start.
3. **Scene summary source:** prefer `sceneSetting` log metadata, then region blurb from campaign state.
