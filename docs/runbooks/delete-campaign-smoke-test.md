# Delete campaign smoke test

Validates epic 019: confirmation UI, full DB/file cleanup, sidebar update, and safe navigation after delete.

## Prerequisites

- Dev: `npm install`
- Player2 HTTP stub on port `54323` (automated script provides this)
- Packaged: `npm run package`

## Automated smoke

```bash
node scripts/delete-campaign-smoke.mjs --skip-package
```

**Contract test (run after changing delete cascade or campaign create persistence):**

```bash
npx vitest run src/main/campaignDeleteIpc.contract.test.ts
```

Flow:

1. Boot app with stub provider
2. Create two campaigns (with character setup)
3. Delete one via sidebar × button → confirm modal
4. Verify list count drops by one, active play view exits, survivor remains
5. Packaged leg repeats delete on a single campaign (unless `--skip-package`)

## Manual smoke

1. Run `npm run dev` with Player2 or Claude configured.
2. Create a campaign, play a turn, upload a portrait in character setup.
3. Click **×** on the campaign row (not the row itself).
4. Confirm permanent delete.
5. Campaign vanishes from sidebar; if it was open, you return to the empty/main view.
6. Other campaigns unchanged.

## Recorded run (template)

| Date | Mode | Result | Notes |
|------|------|--------|-------|
| 2026-06-28 | dev CDP + stub | pass | `node scripts/delete-campaign-smoke.mjs --skip-package` |
