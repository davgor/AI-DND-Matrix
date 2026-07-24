# 167 — Oxlint: split skeleton-fill complexity leftovers

Ticket 165 left helpers and tests over oxlint complexity / max-depth / max-lines-per-function limits. Split helpers and extract fixtures without changing behavior or disabling rules.

## Acceptance criteria

- [x] `skeletonFill.ts` and `pantheonRetrieve.ts` pass oxlint (complexity, max-depth, max-lines) via helper splits only
- [x] `skeletonFill.test.ts` and `pantheonRetrieve.test.ts` pass max-lines-per-function (≤50) via extracted fixtures
- [x] Unused `buildSentenceBlobWorld` / `BLOB_WORLD_HISTORY_TOPICS` removed from `campaignGeneration.test.ts`
- [x] Targeted `npx oxlint` + `npx vitest run` on listed paths are green
