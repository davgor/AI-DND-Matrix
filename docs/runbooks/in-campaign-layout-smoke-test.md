# In-campaign four-column layout smoke test

Validates epic 018: campaigns rail, DM exposition, player interaction, and player sheet columns with collapse persistence and responsive shell.

## Prerequisites

- Dev: `npm install`
- Automated script uses Player2 HTTP stub on port `54322`
- Packaged: `npm run package` → portable `.exe` in `release/`

## Automated smoke (recommended)

```bash
node scripts/in-campaign-layout-smoke.mjs --skip-package
```

Runs:

1. Boot → create campaign → character setup → enter play mode
2. Verify `.in-campaign-layout` with all four column regions
3. Collapse campaigns rail and player sheet rail
4. Verify DM exposition panel and player input in columns 2–3
5. Packaged four-column check (unless `--skip-package`)

Options: `--skip-package`, `--packaged-only`

## Manual smoke (desktop 1280×800)

1. Start Player2 (or stub) and run `npm run dev`.
2. Open a campaign with a player character (play mode).
3. Confirm four columns: campaigns | scene/DM | your actions | character sheet.
4. Collapse left and right rails; confirm quick-switch chips (left) and compact sheet affordance (right).
5. Submit an action; scene header and logs update in columns 2 and 3.

## Narrow window (1024px or less)

1. Resize window below 1280px.
2. Player sheet should overlay when expanded; campaigns rail overlays when expanded on compact widths.
3. DM + player columns remain reachable.

## Recorded run (template)

| Date | Mode | Window | Result | Notes |
|------|------|--------|--------|-------|
| 2026-06-28 | dev CDP + stub | 1280 | pass | `node scripts/in-campaign-layout-smoke.mjs --skip-package` |
