# 082 — Add deadcode to delivery gate + refresh baseline post-061

`Dead Code Check` keeps failing on PRs because agents only run test/lint/build, while epic 061 (and similar refactors) drift `.tsprune-ignore` line numbers and introduce new same-module-only exports. Fold `npm run deadcode` into the standing delivery process and refresh the baseline so CI is green again.

## Acceptance criteria

- [x] `.cursor/rules/delivery-standards.mdc`, delivery-standards skill, and complete-ticket skill require `npm run deadcode` before done (alongside test/lint/build)
- [x] `.tsprune-ignore` refreshed to current `ts-prune` findings for `tsconfig.node.json` + `tsconfig.web.json`
- [x] `npm run deadcode` exits 0
- [x] `npm test`, `npm run lint`, and `npm run build` pass
- [x] `npm run deadcode:refresh` script exists for intentional baseline updates after export churn
