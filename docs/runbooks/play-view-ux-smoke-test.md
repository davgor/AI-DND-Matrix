# Play view UX smoke test (Epic 043)

Validates the refreshed play shell: session chrome, scene hierarchy, composer, play sheet tabs, status alerts, and compact overlay behavior.

See also [in-campaign-layout-smoke-test.md](./in-campaign-layout-smoke-test.md) for the base four-column layout checks.

## Prerequisites

- Dev: `npm install`
- Automated script uses Player2 HTTP stub on port `54322`

## Automated smoke (recommended)

```bash
node scripts/in-campaign-layout-smoke.mjs --skip-package
```

Epic 043 additions verified by the script:

1. `.play-session-chrome` with character label and **Return to Hub** button
2. Multiline composer (`.play-view-input-row textarea`)
3. DM exposition panel and play sheet tabs present at 1280px
4. Compact/sheet-overlay layout class at 1024×720 via CDP device metrics

## Manual smoke — session chrome & hub return

1. Start `npm run dev` with a campaign in play mode.
2. Confirm the chrome bar shows character name, region (when known), in-game day, and optional combat badge.
3. Click **Return to Hub** during exploration — should land on campaign hub without obituary.
4. Enter combat (or load a save with active combat) and click **Return to Hub** — confirm dialog should appear; accepting returns to hub.

## Manual smoke — composer

1. In the player column, type a multi-line action using **Shift+Enter** for newlines.
2. Press **Enter** (without Shift) — action submits; turn-state strip shows **Resolving…** while pending.
3. Scroll a long player log — composer stays pinned at the bottom.

## Manual smoke — DM column hierarchy

1. Scene box shows region blurb or scene-setting text, not a duplicate of the latest feed line.
2. Combat strip appears between scene and feed when combat is active; **Hide combat** collapses it.
3. XP/loot banners auto-dismiss after ~8s; imprisoned/defeat banners persist until cleared.

## Manual smoke — compact overlays (1024px width)

1. Resize window to 1024×720.
2. Expand player sheet — semi-transparent backdrop appears; click backdrop or press **Escape** to dismiss.
3. At compact width, expand campaigns rail — backdrop dismiss closes campaigns overlay first.

## Recorded run (template)

| Date | Mode | Window | Result | Notes |
|------|------|--------|--------|-------|
| 2026-07-01 | dev CDP + stub | 1280 + 1024 | pass | `node scripts/in-campaign-layout-smoke.mjs --skip-package` |
