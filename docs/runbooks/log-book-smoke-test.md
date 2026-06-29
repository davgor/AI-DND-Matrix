# Log book smoke test

Validates epic 025: DM log entry persistence, narration re-grounding, and DB persistence across reopen.

## Prerequisites

- `npm install`
- Native module built: `npm run rebuild:node` (runs automatically via `pretest`)

## Automated smoke

```bash
node scripts/log-book-smoke.mjs
```

Equivalent:

```bash
npx vitest run src/db/logBookSmoke.test.ts
```

Flow:

1. Migrate a fresh SQLite file
2. DM-style log book proposals persist entries across Events, Places, People, etc.
3. `assembleNarrationContext` re-reads the acting character's entries for grounding
4. Reopen the same DB file; entries remain

## Manual smoke (full app + UI)

1. Run `npm run dev` with a configured provider.
2. Open the character sheet and click **Log Book** — empty categories should show “Nothing recorded yet.”
3. Play through narration that introduces a place, person, and event.
4. Reopen **Log Book** — entries appear under the correct category sections with day learned.
5. Restart the app; entries should still be present.
6. Continue play referencing a logged NPC/place; narration should stay consistent with prior entries.

## Recorded run (template)

| Date | Mode | Result | Notes |
|------|------|--------|-------|
| 2026-06-28 | vitest | pass | `node scripts/log-book-smoke.mjs` |
