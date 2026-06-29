# Character journal smoke test

Validates the journal loop at the DB and narration-persist layer (no live LLM required).

## Run

```bash
node scripts/journal-smoke.mjs
```

## What it checks

- Major-beat narration side effects create exactly one informal journal entry
- Routine turns without `journalEntry` do not flood the feed
- Journal entries survive database reopen with reverse-chronological order
- Characters with no entries return an empty list (sheet empty state source)

## Manual UI check (optional)

1. Play through a memorable beat and confirm a first-person note appears in the **Journal** section on the character sheet.
2. Take several routine combat/exploration turns — the journal should not grow every turn.
3. Restart the app and confirm entries remain.
