# 078 — Refresh deadcode CI baseline after guided/canon work

`Dead Code Check` fails on `bug-fixes-07162026` after `.tsprune-ignore` line-number drift (~125 known exports) plus new same-module-only exports from guided opening/generate-reply and canon-recall work. Unexport internals where safe and refresh the ts-prune baseline so `npm run deadcode` is green.

## Acceptance criteria

- [x] Same-module-only dead exports unexported where safe; intentional IPC/barrel exports remain listed in `.tsprune-ignore`
- [x] `.tsprune-ignore` refreshed to current `ts-prune` findings for `tsconfig.node.json` + `tsconfig.web.json`
- [x] `npm run deadcode` exits 0
- [x] `npm test`, `npm run lint`, and `npm run build` pass
