# 067 — Refresh deadcode CI baseline on bug-fixes branch

`Dead Code Check` failed on `bug-fixes-07162026` after line-number drift in `.tsprune-ignore` and a few new same-module-only exports from guided identity / conversation work. Refresh the ts-prune baseline and unexport props/constants that are only used inside their defining modules.

## Acceptance criteria

- [x] Same-module-only dead exports unexported where safe (`IdentityRegionOption`, guided conversation props/constants); unused `latestDmReply` removed
- [x] `.tsprune-ignore` refreshed to current `ts-prune` findings for `tsconfig.node.json` + `tsconfig.web.json`
- [x] `npm run deadcode` exits 0
- [x] `npm test`, `npm run lint`, and `npm run build` pass
