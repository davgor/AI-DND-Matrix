# Startup loading screen smoke test

Validates epic 015: loading screen, DB boot stage, LLM boot stage, handoff to app shell, and failure/retry UX.

## Prerequisites

- `.env` at repo root (or next to packaged `.exe`) with a working provider:
  - **player2** (default): Player2 running at `PLAYER2_BASE_URL`
  - **claude**: valid `CLAUDE_API_KEY`
  - **llamacpp**: `llama-server` reachable (attach) or managed paths configured
- Dev: `npm install`
- Packaged: `npm run package` → `release/AI D&D Matrix.exe`

## Dev-mode smoke (happy path)

1. Ensure Player2 is running (or switch `.env` to a reachable provider).
2. Run `npm run dev`.
3. Observe:
   - Full-screen loading panel appears before sidebar/main content.
   - Stage text shows database loading, then narrative engine boot.
   - Progress bar advances without jumping backward.
   - App shell (sidebar + main panel) appears once — no flicker loop.
4. Click sidebar / generate campaign to confirm interactions work post-handoff.

**Expected outcome:** Loading → ready handoff in under ~30s with Player2 already running.

## Packaged-mode smoke (happy path)

1. Copy `.env` beside `release/AI D&D Matrix.exe`.
2. Ensure provider runtime is available (Player2 running for default config).
3. Launch the `.exe`.
4. Repeat observations from dev smoke.

**Expected outcome:** Same loading flow and single handoff as dev.

## Expected-failure smoke (runtime unreachable)

1. Set `AGENT_PROVIDER=player2` and stop Player2 (or point `PLAYER2_BASE_URL` at a dead port).
2. Launch app (`npm run dev` or packaged `.exe`).
3. Observe:
   - Loading screen shows failure state with runtime category guidance.
   - **Retry** button is visible.
4. Start Player2, click **Retry**.
5. Observe successful handoff to app shell.

**Expected outcome:** Failure UX without crash; retry recovers without full app restart.

## Notes

- DB stage always runs migrations against the user-data SQLite file.
- llama.cpp attach mode polls `GET /health` (503 = still loading, 200 = ready).
- Native module ABI: after packaging changes, run `npm run rebuild:electron` if SQLite errors appear in Electron only.

## Recorded run (template)

| Date | Mode | Provider | Result | Notes |
|------|------|----------|--------|-------|
| 2026-06-28 | dev (built Electron + CDP) | player2 | pass | `node scripts/startup-smoke.mjs --skip-package` |
| 2026-06-28 | dev failure + retry (CDP) | player2 (dead port → stub server) | pass | Retry button recovers without app restart |
| 2026-06-28 | packaged (`release/win-unpacked`) | player2 | pass | `node scripts/startup-smoke.mjs --packaged-only` after `npm run package` |

Automated runner: `node scripts/startup-smoke.mjs` (full suite). Use `--skip-package` to skip portable build; `--packaged-only` to re-run packaged check only.
