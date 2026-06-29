# Campaign-start modal smoke test

Validates epic 017: new-campaign modal, form validation, loading stages, failure/retry, and handoff to campaign review.

## Prerequisites

- Dev: `npm install`
- Automated script uses a local **Player2 HTTP stub** on port `54321` (no real Player2 required for `scripts/campaign-start-smoke.mjs`).
- Packaged: `npm run package` → portable `.exe` in `release/`

## Automated smoke (recommended)

```bash
node scripts/campaign-start-smoke.mjs --skip-package
```

Runs:

1. **Dev happy path** — boot → open modal → fill premise → loading stages → `.campaign-review` visible
2. **Dev failure + retry** — stub returns HTTP 500 on chat completions → error UI → stub recovers → retry → review
3. **Packaged happy path** (unless `--skip-package`) — same success path in built `.exe`

Options:

- `--skip-package` — dev smokes only
- `--packaged-only` — skip dev, run packaged only (expects existing build)

## Manual dev smoke (happy path)

1. Ensure Player2 is running (or use stub env: `PLAYER2_BASE_URL=http://127.0.0.1:54321` with a compatible stub).
2. Run `npm run dev`.
3. Wait for startup handoff (sidebar visible).
4. Click **New Campaign** in the sidebar.
5. Enter a premise, optional name/death mode, click **Create campaign**.
6. Observe loading copy advancing (premise → interpret → save).
7. Modal closes; **campaign review** screen appears with generated regions/NPCs.

**Expected outcome:** Single handoff to review; sidebar lists the new campaign.

## Manual expected-failure smoke

1. Stop Player2 (or point `PLAYER2_BASE_URL` at a dead port) **after** app shell is ready.
2. Open modal, submit a valid premise.
3. Observe **Campaign creation failed** with actionable message.
4. Use **Retry** (after restoring provider) or **Edit form** to return to the form without losing typed values incorrectly.

**Expected outcome:** No crash; retry or back-to-form works; duplicate submits blocked while in flight.

## Packaged smoke

1. Copy `.env` beside `release/AI D&D Matrix.exe` if needed.
2. Launch packaged app or run `node scripts/campaign-start-smoke.mjs` (includes packaged leg).

**Expected outcome:** Same modal → loading → review flow as dev.

## Recorded run (template)

| Date | Mode | Provider | Result | Notes |
|------|------|----------|--------|-------|
| 2026-06-28 | dev (CDP + stub) | player2 stub | pass | `node scripts/campaign-start-smoke.mjs --skip-package` |
| 2026-06-28 | dev failure + retry (CDP) | stub 500 → 200 | pass | Retry recovers to campaign review |
| 2026-06-28 | packaged | player2 stub | pass | `node scripts/campaign-start-smoke.mjs --packaged-only` after `npm run package` |
