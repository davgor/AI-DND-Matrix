# 145 — Fix fast-uri npm audit CVEs

Bump the transitive `fast-uri` lockfile pin so Security Audit CI stops failing on moderate+ advisories (CVE-2026-13676, CVE-2026-16221). Package arrives via `electron-builder` → `ajv`; fixed by `npm audit fix` to `fast-uri@3.1.4`.

## Acceptance criteria

- [x] `package-lock.json` resolves `fast-uri` to `3.1.4` (or newer patched)
- [x] `npm audit` reports no moderate/high/critical vulnerabilities
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass
- [x] `act` pr-checks + deadcode workflows succeed (or Docker paused with user confirmation)
