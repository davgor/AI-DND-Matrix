# 089 — Dev-only campaign action trace log

While developing, every player turn should emit a correlated, structured trace so Social/routing bugs (empty plans, silent resolves, heuristic vs LLM) can be reconstructed from the main-process terminal and electron-log files.

Covers the full player-action path: Play View submit → `turn:resolve` IPC → intent/route → branch → beat execution → complete/error. Production builds emit nothing (gated on `import.meta.env.DEV`). No network telemetry.

## Acceptance criteria

- [x] Shared helpers create a turn id, truncate player input, and format a stable `[campaignAction]` prefix
- [x] Main-process tracer logs `ui_submit` correlation (via optional `clientTraceId`), `ipc_start`, `intent_route`, `branch`, `beats`, `complete`, and `error` in DEV only
- [x] Traces write to **console** (visible under `npm run dev`) and **electron-log** `debug`
- [x] Unit tests cover enable/disable, truncation, and payload shape
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass
