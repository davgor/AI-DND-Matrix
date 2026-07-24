# 156 — Harden Windows CI `npm ci` against flakes

PR #31 CI Checks failed on `test (0)` at `npm ci` while `test (1)` / `test (2)` / lint / build succeeded on the same commit with no lockfile changes. Treat that as a real failure: Windows Actions + `cache: npm` / Electron postinstall downloads are known intermittent abort classes.

## Acceptance criteria

- [x] Windows CI jobs in `pr-checks.yml` do not use `setup-node` `cache: npm` (known silent abort / restore flake on Windows)
- [x] Shared `scripts/npm-ci-with-retry.mjs` retries `npm ci` and skips Electron binary download during install (`ELECTRON_SKIP_BINARY_DOWNLOAD=1`); unit tests cover retry + env
- [x] `pr-checks.yml` test/lint/build jobs install via that script; test job still runs explicit `electron/install.js` after install
- [x] `npm test` / `npm run lint` / `npm run build` / `npm run deadcode` pass
- [x] `act` pr-checks.yml + deadcode.yml succeed
