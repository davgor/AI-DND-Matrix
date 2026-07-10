# 058 — Region regenerate on campaign review

Replace per-region overview editing with a top-right **Regenerate** control. Confirming the modal deletes the selected region (and dependents), then runs the existing additional-region generation with the user's seed prompt.

## Acceptance criteria

- [x] Region card shows read-only overview; **Regenerate** sits top-right of the card
- [x] Regenerate modal collects seed prompt and NPC count (same bounds as add-region)
- [x] Confirm deletes the old region, NPCs, history, quest hooks, and related rows, then adds a new generated region
- [x] IPC + repository tests cover cascade delete; edit IPC test covers delete-then-generate flow
- [x] `npm run lint`, and `npm run build` pass
- [ ] `npm test` (blocked locally: `better-sqlite3` locked / Electron ABI mismatch — run `npm rebuild better-sqlite3` after closing the app)
