# 080 — Refresh deadcode CI baseline after pantheon (059)

`Dead Code Check` fails after epic **059** pantheon work: `.tsprune-ignore` line numbers drifted for campaign-generation / IPC / preload barrels, and new pantheon exports (`generateCampaignPantheon`, `editPantheonSummary`, `CreateDeityInput`, etc.) need baseline entries or unexport where same-module-only.

## Acceptance criteria

- [x] Same-module-only dead exports unexported where safe; intentional IPC/barrel/test-facing exports remain listed in `.tsprune-ignore`
- [x] `.tsprune-ignore` refreshed to current `ts-prune` findings for `tsconfig.node.json` + `tsconfig.web.json`
- [x] `npm run deadcode` exits 0
- [x] `npm test`, `npm run lint`, and `npm run build` pass
