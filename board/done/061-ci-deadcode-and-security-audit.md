# 061 — CI deadcode and security audit checks

Mirror ElectronServerManager CI hygiene in AI-DND-Matrix: `ts-prune` dead-export detection with a baseline ignore file, plus `npm audit` failing on moderate+ vulnerabilities on pull requests.

## Acceptance criteria

- [x] `npm run deadcode` runs `ts-prune` against `tsconfig.node.json` and `tsconfig.web.json`, failing on exports not listed in `.tsprune-ignore`
- [x] `.github/workflows/deadcode.yml` runs on push/PR to `main`
- [x] `.github/workflows/security-audit.yml` runs on PR to `main` and fails on moderate+ advisories
- [x] `npm test`, `npm run lint`, and `npm run build` pass
