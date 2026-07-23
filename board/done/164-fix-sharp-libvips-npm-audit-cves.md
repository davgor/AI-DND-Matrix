# 164 — Fix sharp/libvips npm audit CVEs

Override transitive `sharp` (via `@huggingface/transformers`) to `>=0.35.0` so Security Audit CI stops failing on high advisories (CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591 / GHSA-f88m-g3jw-g9cj). Lockfile resolves `sharp@0.35.3`.

## Acceptance criteria

- [x] `package.json` overrides `sharp` to `>=0.35.0` (or newer patched) and lockfile resolves a patched version
- [x] `npm audit` reports no moderate/high/critical vulnerabilities
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass
- [x] `act` pr-checks + deadcode workflows succeed (or Docker paused with user confirmation)
