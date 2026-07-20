# 111 — Harden quest proposals against invalid FK refs

Playtesting: DM narration with a `questProposals` side effect can abort the whole turn with `SqliteError: FOREIGN KEY constraint failed` inside `createQuest` ← `resolveQuestIdFromProposal` ← `persistQuestProposal`.

LLM proposals may invent `regionId` / `relatedWorldFactId` that are not rows in `regions` / `world_facts`. Those optional FKs must be nulled (or promotion skipped) so the quest still persists and the turn completes.

## Acceptance criteria

- [x] `persistQuestNarrationSideEffects` with a proposal that has a nonexistent `regionId` creates the quest with `regionId: null` (no throw)
- [x] `persistQuestNarrationSideEffects` with a proposal that has a nonexistent `relatedWorldFactId` creates the quest with `sourceWorldFactId: null` (no throw)
- [x] Valid `regionId` / promoteable `relatedWorldFactId` still attach correctly
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode pass
