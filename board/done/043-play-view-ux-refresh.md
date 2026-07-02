# EPIC: Play view UX refresh — session chrome, stage hierarchy, and interaction polish

Epic **018** delivered a solid four-column *shell*, but gameplay features stacked on top without revisiting information hierarchy. After **029** (log routing), **031** (combat HUD in column 2), **034–036** (reward banners), and **038** (campaign hub gate), the play view has accumulated UX debt:

- **Column 2 overload** — combat HUD, scene header, multiple alert banners, roll toggle, and full exposition feed compete for vertical space
- **Scene duplication** — `pickCurrentSceneText` shows the latest DM line in the scene box while the same line also appears in the feed below
- **Prototype player column** — single-line input, no auto-scroll, no local turn-state affordances
- **Full character sheet in 280px** — journal, inventory, perks, and log-book all visible in a narrow rail (`CharacterSheetBody` with `compact={false}`)
- **Half-styled status UI** — banner class names in `dmExpositionParts.tsx` (`dm-defeat-disposition-banner`, `dm-xp-reward-banner`, etc.) lack CSS in `playView.css`
- **Latent compact bug** — `CombatHud` checks `layoutMode === 'narrow'`, which is not a valid `InCampaignLayoutMode`, so compact HUD never activates
- **No mid-session hub exit** — `onExitToCampaignHub` exists but is only wired from obituary dismiss
- **`onRequestDelete` not passed** — `PlayView.tsx` omits it when rendering `InCampaignPlayColumns` despite the prop existing on the interface

This epic is a **renderer-only UX pass**: preserve the turn loop, log-split contract in `sceneContext.ts`, and IPC boundaries. Change how play *feels* and *reads*, not how turns resolve.

Builds on **010** (play loop), **018** (four-column shell), **029** (log routing), **031** (combat HUD), **034–036** (reward banners), **038** (hub gate + `onExitToCampaignHub`).

**Layout contract:** `src/shared/inCampaignLayout/PLAY_VIEW_UX_SPEC.md`

Broken down into sub-tickets **043.1–043.12**. This epic is done when all are complete and `npm test`, `npm run lint`, and `npm run build` pass.

## Design direction

```
┌─────────────────────────────────────────────────────────────────┐
│ Play session chrome: Character · Region · Day · Combat · Hub   │
├──────┬──────────────────────────────┬─────────────┬─────────────┤
│ Camp │ Scene summary (not duplicate)│ Speech log  │ Sheet tabs  │
│ rail │ Combat strip (collapsible)   │             │ Combat/Stats│
│      │ Status alerts (styled)       │             │ Gear/Journal│
│      │ Story feed (auto-scroll)     │ Composer ▼  │             │
└──────┴──────────────────────────────┴─────────────┴─────────────┘
```

**Principles:**

1. **One job per region** — combat state, scene context, narration history, and reward alerts should not all compete in column 2 without hierarchy
2. **Scene ≠ latest DM line** — the scene box shows *where you are and what's happening*, not a repeat of the most recent narration
3. **Composer-first player column** — input pinned to the bottom, multiline, with turn/combat/imprisoned state surfaced locally
4. **Play-optimized sheet** — combat-relevant info first; journal/log-book as tabs, not always visible in a narrow rail
5. **Session navigation** — hub is a first-class exit from live play, not only via obituary
6. **Consistent overlays** — recap, promotion, level-up, and obituary follow one layering contract

## Definition of done

- Play view has a **session chrome** bar (character identity, location, in-game day, combat indicator, return-to-hub)
- Column 2 has clear **vertical hierarchy**: scene summary → optional combat strip → status alerts → scrollable feed (no duplicate scene/narration)
- Column 3 has a **composer** (multiline, sticky footer, auto-scroll log, local turn-state affordances)
- Column 4 uses a **play-mode sheet** (combat-first tabs or compact variant), not the full onboarding sheet jammed into 280px
- Defeat / XP / loot / imprisoned / alignment banners are **styled and consolidated** (no orphan class names)
- `CombatHud` compact mode works at `sheet-overlay` and `compact` breakpoints
- Overlay/modal stacking is documented and consistent; roll-visibility toggle moves out of the DM feed
- `onRequestDelete` is wired through `PlayView` → `InCampaignPlayColumns`
- Responsive overlay rails have **dismiss affordances** (backdrop / Escape)
- Tests + smoke runbook cover the refreshed layout at desktop and compact widths

043.1 play view UX spec · 043.2 play session chrome bar · 043.3 scene summary model · 043.4 combat strip hierarchy + compact fix · 043.5 status alert system · 043.6 DM exposition feed polish · 043.7 player composer redesign · 043.8 play-mode character sheet rail · 043.9 overlay layering + settings relocation · 043.10 campaign rail wiring + hub/play alignment · 043.11 responsive overlay rail UX · 043.12 tests, smoke runbook, README touch-up

## Open decisions (resolve during 043.1)

- **Hub exit mid-session:** auto-save and exit immediately, or confirm when combat is active / turn is submitting?
- **Sheet rail default:** always start collapsed in play, or remember last tab/collapse per character?
- **Scene summary source:** region card text only, or explicit `sceneSetting` log metadata from DM agent?

## Out of scope

- Image backgrounds / character portrait generation (**m001**)
- Turn routing or LLM call changes (**029**, **040**)
- Hub layout redesign (**038** — already its own screen)
- New gameplay mechanics (quests, map, travel UI beyond labels in chrome)

## Sub-tickets

### 043.1 Play view UX spec + layout contract update

#### Description

Write `src/shared/inCampaignLayout/PLAY_VIEW_UX_SPEC.md` documenting the refreshed hierarchy, what each region owns, and what stays unchanged (log filters in `sceneContext.ts`, turn submission flow, hub eligibility from 038).

Define:

- **Session chrome** fields and data sources (character name/portrait, `currentRegionId`, in-game day, `combatState`, imprisoned flag)
- **Scene summary** vs **feed entry** distinction (scene is synthesized context, not `pickCurrentSceneText` = latest DM line)
- **Play sheet tabs** and default tab per mode (exploration vs combat)
- **Overlay z-index stack** (recap < promotion < level-up < obituary < sheet/campaign overlays)
- Resolve open decisions listed above

#### Acceptance Criteria

- [x] Spec checked in under `/shared` and referenced from epic
- [x] Explicit non-goals: no turn-loop changes, no hub layout changes, no new gameplay mechanics
- [x] Column log-split contract from 029 preserved or spec documents any intentional change

---

### 043.2 Play session chrome bar

#### Description

Add a full-width header inside the play shell (above the grid), visible in all `InCampaignLayoutMode`s.

Contents (left → right):

- Active **character name** + small portrait thumbnail
- **Region** label (resolved name from campaign state)
- **In-game day** counter
- **Combat** badge when `combatState.active` (round/turn summary on hover or compact text)
- **Return to Campaign Hub** button — wires `onExitToCampaignHub` (today only reachable from obituary dismiss)

Live in new `PlaySessionChrome.tsx`; data from `usePlayViewController` + campaign/character IPC already used by sheet.

#### Acceptance Criteria

- [x] Chrome renders in play mode with correct character/region/day/combat fields
- [x] Hub button calls `onExitToCampaignHub` without requiring death
- [x] Chrome does not collapse or clip at 1024px width
- [x] UI test verifies hub navigation callback and combat badge visibility

---

### 043.3 Scene summary model (dedupe header vs feed)

#### Description

Replace `pickCurrentSceneText` (latest DM line) with a **scene summary** suited for the stage header:

- Prefer persisted **region name + short region blurb** or latest DM **scene-setting** line (new optional `sceneSetting` flag on log entries if needed — renderer/main only, backward compatible)
- Feed below continues to show full narration history including the latest DM line
- Empty state: "The scene is quiet…" with region name if known

Update `DmExpositionPanel` / `dmExpositionParts.tsx` accordingly.

#### Acceptance Criteria

- [x] Scene header does not duplicate the latest DM narration line in the feed below
- [x] Scene header updates on travel, combat start/end, and region generation
- [x] Unit tests for scene summary selection with mixed log fixtures
- [x] No regression to `filterDmExpositionEntries` / `filterPlayerInteractionEntries` split

---

### 043.4 Combat strip hierarchy + compact mode fix

#### Description

Refactor `CombatHud` presentation:

- Fix compact trigger: `layoutMode === 'compact' || layoutMode === 'sheet-overlay'` (remove dead `'narrow'` check in `PlayDmExpositionColumn.tsx`)
- Present combat as a **dedicated strip** between scene summary and feed — collapsible when user wants more narration space
- Default expanded when combat active; collapsed preference persisted (local preference file, same pattern as rail collapse)
- At compact widths, strip shows initiative order + active combatant only; expand for full HP/conditions

#### Acceptance Criteria

- [x] Compact HUD activates at `sheet-overlay` and `compact` modes
- [x] Collapse/expand works during active combat without losing state
- [x] Player attack / flee / yield flows unchanged (existing combat tests pass)
- [x] UI test: combat strip renders and collapses

---

### 043.5 Status alert system (banners + styling)

#### Description

Consolidate alignment shift, imprisoned, defeat disposition, XP, and loot into a single **`PlayStatusAlerts`** component with shared styling in `playView.css`.

- Add missing CSS for `dm-defeat-disposition-banner`, `dm-xp-reward-banner`, `dm-loot-reward-banner`, `dm-imprisoned-status`
- Cap visible alerts (e.g. max 2 + "N more" expander) so column 2 doesn't grow unbounded
- Auto-dismiss transient rewards (XP/loot) after N seconds; persist imprisoned/defeat until cleared by turn result

#### Acceptance Criteria

- [x] All banner types have intentional visual design consistent with theme
- [x] Alert stack does not push feed off-screen on 720px-tall window
- [x] Screen reader roles preserved (`role="alert"` / `role="status"`)
- [x] UI test covers at least imprisoned + XP alert rendering

---

### 043.6 DM exposition feed polish

#### Description

Improve the scrollable feed in column 2:

- **Auto-scroll** to bottom on new entries (with "pinned scroll" if user scrolls up — standard chat pattern)
- Clear **speaker labels** (DM, NPC name, party member name) — reuse emphasis conventions from **030**
- Subtle timestamp or turn separator optional (dev-only toggle OK)
- Loading/error states from 018.5 remain but visually integrated with new hierarchy

#### Acceptance Criteria

- [x] New narration auto-scrolls unless user has scrolled up (unit test or RTL test for scroll behavior)
- [x] Speaker attribution visible on NPC/party lines
- [x] Long sessions remain performant (no full re-mount per entry; key on `entry.id`)

---

### 043.7 Player composer redesign

#### Description

Replace `PlayerActionPanel` prototype UX:

- **Multiline** `<textarea>` with Shift+Enter newline, Enter to submit (document in placeholder)
- **Sticky footer** composer — log scrolls above, input always visible
- **Auto-scroll** player speech log on new entries
- Local **turn-state strip** above input: submitting spinner, imprisoned notice, combat "your turn" / "waiting" when applicable
- Disable rules unchanged (`submitting`, `obituaryBlocking`)

#### Acceptance Criteria

- [x] Multiline input submits on Enter, newline on Shift+Enter
- [x] Composer stays visible when feed is long (flex layout, `min-height: 0`)
- [x] Turn-state messages visible without reading DM column
- [x] UI test: submit cycle, disabled states, imprisoned blocking

---

### 043.8 Play-mode character sheet rail (tabs / compact)

#### Description

Introduce `PlaySheetRail` (or extend `PlayerSheetRail`) with **play-optimized tabs**:

| Tab | Default content |
|-----|-----------------|
| **Combat** | HP, AC, conditions, equipped weapon, key stats |
| **Character** | Abilities, perks, identity summary |
| **Gear** | Inventory / equipment (compact list) |
| **Journal** | Character journal (027) — not play speech log |

- Default tab: **Combat** when `combatState.active`, else **Character**
- Log book opens as modal (existing pattern) from Character or Gear tab
- Full `CharacterSheetBody` remains available for hub/setup; play rail uses a slimmer variant

#### Acceptance Criteria

- [x] Rail readable at 280px without horizontal scroll for combat tab
- [x] Tab state resets appropriately on combat start/end (or persists per user preference — pick one, document in spec)
- [x] Journal tab shows journal entries, not `filterPlayerInteractionEntries` play log
- [x] UI test: tab switch + combat default tab

---

### 043.9 Overlay layering + settings relocation

#### Description

- Document and implement overlay stack per 043.1 spec
- Move **Show rolls** toggle from `DmExpositionPanel` to session chrome or settings dropdown (reuse `rollVisibilityPreference.ts`)
- Align recap/promotion with consistent positioning; optional light scrim when they block interaction
- Ensure `LevelUpModal` + `RecapBanner` + active combat don't create unreachable UI (z-index + focus trap audit)

#### Acceptance Criteria

- [x] Roll toggle removed from DM feed; still persists across restart
- [x] Documented z-index order in spec matches implementation
- [x] Manual checklist: level-up during recap does not trap focus behind overlay (documented in play-view-ux-smoke-test.md overlay section)
- [x] No regression to promotion flow (011)

---

### 043.10 Campaign rail wiring + hub/play chrome alignment

#### Description

- Pass `onRequestDelete` from `ReadyAppPlayView` → `PlayView` → `InCampaignPlayColumns` (prop exists on interface but `PlayView` omits it today)
- Visual alignment between hub `Sidebar` wrapper and play column-1 `CampaignsRail` (shared padding, collapse affordance, campaign title treatment)
- Optional: show active campaign name in session chrome when campaigns rail collapsed

#### Acceptance Criteria

- [x] Delete campaign works from play mode campaigns rail
- [x] Collapsed rail quick-switch chips still work
- [x] Hub and play campaign list look like the same product surface

---

### 043.11 Responsive overlay rail UX

#### Description

For `sheet-overlay` and `compact` modes in `inCampaignLayout.css`:

- Semi-transparent **backdrop** when campaigns or sheet rail expanded as overlay
- Click backdrop or **Escape** closes expanded overlay rail
- Verify DM + player columns usable at 1024×720 and 1280×800
- Fix any clipping from new session chrome height

#### Acceptance Criteria

- [x] Backdrop dismiss closes overlay rails without collapsing preference state incorrectly
- [x] Escape key closes topmost overlay rail
- [x] Manual runbook steps pass at 1024px width (documented in play-view-ux-smoke-test.md)
- [x] `InCampaignLayout` tests cover chrome + overlay class combinations

---

### 043.12 Tests, smoke runbook, and README touch-up

#### Description

- Extend `scripts/in-campaign-layout-smoke.mjs` for: session chrome present, hub button exists, compact width, combat strip if combat seeded
- Add RTL tests for `PlaySessionChrome`, `PlayerActionPanel` composer, `PlayStatusAlerts`
- Update `docs/runbooks/in-campaign-layout-smoke-test.md` or add `play-view-ux-smoke-test.md`
- README roadmap: note 043 when promoted to in-progress

#### Acceptance Criteria

- [x] Automated smoke covers refreshed selectors at 1280px and one compact width
- [x] At least 3 new component-level UI tests (not callback stubs)
- [x] Runbook documents manual hub-return and composer behavior
- [x] `npm test`, `npm run lint`, and `npm run build` pass with epic complete (integration pass)
