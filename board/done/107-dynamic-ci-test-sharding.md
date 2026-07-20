# 107 — Dynamic CI unit-test sharding (~1m)

GitHub Actions currently runs the full Vitest suite in one job (~2m). Split tests across a dynamic matrix of duration-balanced shards targeting ~60s each so wall-clock CI stays near one minute as the suite grows. Local `npm test` stays a full unsharded run.

## Acceptance criteria

- [x] `scripts/testShardPlan.mjs` bin-packs files by estimated duration with `N = ceil(totalMs / 60000)` (min 1), covered by unit tests
- [x] CI `pr-checks.yml` runs `test-plan` then a matrix of shard jobs; each shard runs only its file list
- [x] Seed timings file + merge helper exist so new files get a median/fallback estimate
- [x] Local `npm test` remains a full unsharded suite
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass
