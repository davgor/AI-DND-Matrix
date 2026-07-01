# Play view UX specification (Epic 043)

Renderer-only UX contract for the in-campaign four-column play shell. Turn resolution, log routing filters, and IPC boundaries from epics **010**, **018**, **029**, and **038** are unchanged.

## Non-goals

- No turn-loop or LLM routing changes (**029**, **040**)
- No campaign hub layout redesign (**038**)
- No new gameplay mechanics (quests, map UI, image generation)
- No changes to `filterDmExpositionEntries` / `filterPlayerInteractionEntries` split (**029**)

## Layout hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│ Play session chrome (all layout modes)                          │
├──────┬──────────────────────────────┬─────────────┬─────────────┤
│ Camp │ Scene summary                │ Speech log  │ Sheet tabs  │
│ rail │ Combat strip (collapsible)   │             │ Combat/Char │
│      │ Status alerts (max 2 + more) │ Composer ▼  │ Gear/Journal│
│      │ Story feed (auto-scroll)     │             │             │
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
- **Feed**: full `filterDmExpositionEntries` history including the latest DM line; speaker labels on each line.

Log-split contract from **029** is preserved; only the scene header selection changes.

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

## Overlay z-index stack

Lowest → highest (implementation in CSS):

| Layer | z-index | Notes |
|-------|---------|-------|
| Grid columns | 0 | Base play layout |
| In-campaign overlays container | 5 | Recap, promotion (pointer-events on children) |
| Recap / promotion banners | 10 | Centered top; light scrim optional |
| Sheet overlay rail (`sheet-overlay`, `compact`) | 20–25 | Right rail when expanded |
| Campaigns overlay rail (`compact`) | 30 | Left rail when expanded |
| Overlay backdrop | 15 | Semi-transparent; click/Escape dismiss |
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

## Open decisions (resolved)

1. **Hub exit mid-session:** exit immediately; confirm **only when combat is active**.
2. **Sheet rail default tab:** Combat when combat active, else Character; auto-switch to Combat on combat start.
3. **Scene summary source:** prefer `sceneSetting` log metadata, then region blurb from campaign state.
