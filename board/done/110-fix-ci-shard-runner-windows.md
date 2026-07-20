# 110 — Fix CI shard runner on Windows (vitest spawn + JSON report)

GitHub Actions Windows shard jobs exit 1 after `run-test-shard.mjs`: Vitest JSON report is missing from `%TEMP%` (`ENOENT` on `vitest-report-shard-N.json`). Root cause: spawning `npx.cmd` with `shell: false` is unreliable on Windows, so the report never lands and the job fails.

## Acceptance criteria

- [x] Shard runner invokes Vitest via `node node_modules/vitest/vitest.mjs` (no `npx.cmd`), covered by unit test
- [x] JSON report path is under the repo workspace (not OS temp), so timings extract works on Windows GHA
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode pass
