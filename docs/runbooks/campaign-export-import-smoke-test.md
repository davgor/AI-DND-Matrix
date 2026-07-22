# Campaign export / import / duplicate smoke test

Validates epic **132**: portable `.aittrpg` packages, import as a new campaign id, in-app duplicate, and secret exclusion.

## Prerequisites

- Dev: `npm install`, then `npm run dev`
- Two installs or two userData profiles optional for “machine A → machine B” (same machine with export file is enough for most checks)

## Automated coverage

```bash
npx vitest run src/db/campaignPortability src/shared/campaignPortability src/main/campaignPortabilityIpc.test.ts src/renderer/src/sidebar/campaignPortabilityActions.test.ts
```

## Manual smoke — same machine

1. Create or open a campaign with at least one character (optional: portrait upload, face token).
2. In the sidebar row, click **↗ Export** → save `*.aittrpg`.
3. Click **Import Campaign…** → choose that file → a second sidebar entry appears with a **new** id (same name is fine).
4. Open the imported campaign (hub/detail loads; migrations apply as usual).
5. On the original row, click **Duplicate** → a third entry appears; rename/edit one campaign and confirm the other is unchanged.
6. Confirm Settings / `.env` API keys still work and were never asked for during import.

## Manual smoke — friend-machine handoff

1. **Machine A:** Export a playable campaign to a `.aittrpg` file (USB / chat / drive).
2. **Machine B** (fresh userData or another PC install): **Import Campaign…** → select the file.
3. Imported campaign appears in the sidebar; open it and confirm world + characters load.
4. Confirm no provider keys were required for import itself (keys only needed later to generate/play with cloud providers).

## Negative checks

- Import a truncated/non-SQLite file → typed error in the rail; campaign count unchanged.
- Package does not contain `OPENAI_API_KEY` / `CLAUDE_API_KEY` / `sk-ant-` material (covered by unit test scan).

## Recorded run (template)

| Date | Mode | Result | Notes |
|------|------|--------|-------|
| 2026-07-21 | unit + IPC tests | pass | round-trip + corrupt reject + duplicate isolation |
| 2026-07-21 | local gate + act | pass | `npm test`/`lint`/`build`/`deadcode`; act pr-checks + deadcode.yml all `Job succeeded` |
